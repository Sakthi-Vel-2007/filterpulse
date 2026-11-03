
import type { PumpType } from "../types";

export type SensorState = "simulated" | "recorded" | "connected" | "offline";
export type DataMode = "simulated" | "recorded" | "live";

export interface SensorRow {
  component: string;
  measures: string;
  state: SensorState;
  source: string;
}

const STALE_MS = 10_000; // live data older than 10 s counts as offline

export function stateFor(mode: DataMode, lastTs: number | null): SensorState {
  if (mode === "simulated") return "simulated";
  if (mode === "recorded") return "recorded";
  if (lastTs === null || Date.now() - lastTs > STALE_MS) return "offline";
  return "connected";
}

export function getSensorRows(
  mode: DataMode,
  lastTs: number | null,
  pumpType: PumpType
): SensorRow[] {
  const s = stateFor(mode, lastTs);
  const src =
    mode === "simulated" ? "Simulator" : mode === "recorded" ? "Recorded file" : "ESP32 via cloud";

  const pump: SensorRow =
    pumpType === "BLDC"
      ? {
          component: "BLDC controller telemetry",
          measures: "Phase current and motor speed",
          state: s,
          source: mode === "simulated" ? "Simulated BLDC controller" : "BLDC drive",
        }
      : { component: "INA219 + 0.1 Ω shunt", measures: "Pump current", state: s, source: src };

  return [
    pump,
    { component: "Supply voltage", measures: "Pump supply (V)", state: s, source: src },
    { component: "TDS probe (inlet)", measures: "Input TDS", state: s, source: src },
    { component: "TDS probe (outlet)", measures: "Output TDS", state: s, source: src },
    { component: "Turbidity sensor", measures: "Inlet turbidity", state: s, source: src },
    { component: "DS18B20", measures: "Water temperature", state: s, source: src },
    { component: "pH probe", measures: "Inlet pH", state: s, source: src },
    { component: "Flow sensor", measures: "Purified-water flow", state: s, source: src },
  ];
}