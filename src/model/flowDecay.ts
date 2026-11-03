/**
 * Flow Decay Slope & Temperature Normalisation Model
 *
 * Provides pure functions for estimating hydraulic filter depletion
 * from permeate flow decay rates, compensating for water temperature.
 *
 * NOTE: All constants represent placeholder assumptions for Phase 1 simulation
 * and will be validated on the physical test bench.
 */

/* ------------------------------------------------------------------ */
/*  Placeholder Assumptions / Constants                               */
/* ------------------------------------------------------------------ */

/**
 * ⚠️ Placeholder assumption: Reference temperature for water viscosity and membrane permeability (°C)
 */
export const T_REF = 25;

/**
 * ⚠️ Placeholder assumption: Temperature coefficient of water viscosity/permeability (~2.5% per °C)
 */
export const TEMP_COEFF = 0.025;

/**
 * ⚠️ Placeholder assumption: Clean-filter baseline permeate flow rate at T_REF (L/min)
 */
export const CLEAN_FILTER_FLOW = 0.45;

/**
 * ⚠️ Placeholder assumption: End-of-life cutoff ratio (70% of clean-filter flow)
 */
export const FLOW_LIMIT_RATIO = 0.7;

/**
 * ⚠️ Placeholder assumption: Minimum allowable permeate flow threshold (L/min)
 * Depletion limit = 0.7 * clean-filter flow = 0.315 L/min
 */
export const FLOW_LIMIT = FLOW_LIMIT_RATIO * CLEAN_FILTER_FLOW; // 0.315 L/min

/* ------------------------------------------------------------------ */
/*  Pure Mathematical Models                                          */
/* ------------------------------------------------------------------ */

/**
 * Normalises raw permeate flow rate to reference temperature (25°C).
 * Compensates for seasonal water temperature fluctuations so cold water
 * is not falsely diagnosed as filter clogging.
 *
 * Formula: normalisedFlow = flow / (1 + TEMP_COEFF * (temp - T_REF))
 */
export function normalisedFlow(flow: number, temp: number): number {
  const denominator = 1 + TEMP_COEFF * (temp - T_REF);
  if (denominator <= 0) return flow;
  return flow / denominator;
}

/**
 * Calculates least-squares linear regression slope (m) from parallel arrays.
 *
 * m = (N * sum(xy) - sum(x) * sum(y)) / (N * sum(x^2) - (sum(x))^2)
 *
 * Returns 0 if fewer than 2 points or zero variance in xs.
 */
export function slope(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-12) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Estimates remaining cumulative litres of water production until permeate flow
 * decays to the minimum acceptable flow limit.
 *
 * Formula:
 * - If slope >= 0 (flow steady or rising): returns Infinity
 * - If slope < 0 (flow decaying): (flowNow - flowLimit) / -slope
 */
export function remainingLitresFromFlow(
  flowNow: number,
  flowLimit: number = FLOW_LIMIT,
  slopePerLitre: number
): number {
  if (slopePerLitre >= 0) return Infinity;
  return Math.max(0, (flowNow - flowLimit) / -slopePerLitre);
}

/**
 * Formats slope into human-readable "L/min lost per 100 L processed"
 */
export function flowLossPer100L(slopePerLitre: number): number {
  if (slopePerLitre >= 0) return 0;
  return Math.abs(slopePerLitre) * 100;
}

/* ------------------------------------------------------------------ */
/*  Fallback Mode State Management (Cross-Page Sync)                  */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "filterpulse_fallback_mode";

export function getFallbackMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setFallbackMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
    window.dispatchEvent(new Event("filterpulse_fallback_change"));
  } catch {
    // Ignore storage errors in sandboxed contexts
  }
}
