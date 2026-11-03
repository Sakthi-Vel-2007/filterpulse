
import { STAGES } from "./remainingLife";
import { normalisedCurrent } from "./load";
import type { StageId } from "../types";

// PLACEHOLDER calibration constants. Each one is to be measured on the bench rig.
export const CAL = {
  cleanCurrent: 1.0,    // normalised pump current with new cartridges (A at 24 V)
  cleanFlow: 0.45,      // product flow with new cartridges at 25 °C (L/min)
  flowDropAtFull: 0.3,  // fraction of flow lost when every stage is fully fouled
  rejClean: 92,         // RO rejection with a new membrane (%)
  rejLimit: 82,         // RO rejection at which the membrane must be replaced (%)
  tempCoeff: 0.025,     // flow change per °C (about 2-3% per °C in the abstract)
  tRef: 25,             // reference temperature (°C)
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export interface PhysicsInput {
  current: number;
  voltage: number;
  flow: number;
  temp: number;
  tdsIn: number;
  tdsOut: number;
}

export interface PhysicsEstimate {
  normCurrent: number;   // A at 24 V
  hli: number;           // hydraulic load index (1.00 = clean)
  rejectionPct: number;  // RO rejection (%)
  flow25: number;        // temperature-corrected flow (L/min)
  resistanceIdx: number; // Darcy-type resistance index R/R0
  fRo: number;           // RO fouling 0..1, from rejection
  fPre: number;          // sediment + UF fouling 0..1, from the remaining pump load
  fFlow: number;         // overall fouling 0..1, from flow decay (cross-check)
  fPumpAvg: number;      // overall fouling implied by the pump-based estimates
}

export function estimatePhysics(i: PhysicsInput): PhysicsEstimate {
  const normCurrent = normalisedCurrent(i.current, i.voltage);
  const hli = normCurrent / CAL.cleanCurrent;
  const rejectionPct = i.tdsIn > 0 ? (1 - i.tdsOut / i.tdsIn) * 100 : 0;
  const flow25 = i.flow / (1 + CAL.tempCoeff * (i.temp - CAL.tRef));
  const resistanceIdx = hli / (flow25 / CAL.cleanFlow);

  const wS = STAGES.sediment.loadWeight;
  const wU = STAGES.uf.loadWeight;
  const wR = STAGES.ro.loadWeight;

  const fRo = clamp01((CAL.rejClean - rejectionPct) / (CAL.rejClean - CAL.rejLimit));
  const fPre = clamp01((hli - 1 - wR * fRo) / (wS + wU));
  const fFlow = clamp01((1 - flow25 / CAL.cleanFlow) / CAL.flowDropAtFull);
  const fPumpAvg = (2 * fPre + fRo) / 3;

  return { normCurrent, hli, rejectionPct, flow25, resistanceIdx, fRo, fPre, fFlow, fPumpAvg };
}

// Exponential smoothing so single noisy readings do not make the numbers jump.
export function blend(
  prev: PhysicsEstimate,
  next: PhysicsEstimate,
  alpha = 0.2
): PhysicsEstimate {
  const out = { ...next };
  (Object.keys(next) as (keyof PhysicsEstimate)[]).forEach((k) => {
    out[k] = prev[k] * (1 - alpha) + next[k] * alpha;
  });
  return out;
}

// The pump signal alone cannot separate sediment from UF, so both share one estimate.
export function stageFouling(e: PhysicsEstimate): Record<StageId, number> {
  return { sediment: e.fPre, uf: e.fPre, ro: e.fRo };
}