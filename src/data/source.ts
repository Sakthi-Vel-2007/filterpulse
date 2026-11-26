import { useEffect, useState } from "react";
import { Simulator } from "./simulator";
import { useLive, useMode } from "./live";
import type { Mode } from "./live";
import type { DataSource, Reading, StageId } from "../types";

export const simulator = new Simulator();
export const activeSource: DataSource = simulator;

/** The current reading: from the simulator in Simulated mode, from the purifier in Live mode. */
export function useReading(): Reading | null {
  const mode = useMode();
  const live = useLive();
  const [sim, setSim] = useState<Reading | null>(null);

  useEffect(() => {
    if (mode !== "simulated") return undefined;
    return simulator.subscribe(setSim);
  }, [mode]);

  return mode === "live" ? live.reading : sim;
}

/** Per-stage fouling and litres: simulator values, or estimates from the live signals. */
export function useModelState(): {
  mode: Mode;
  fouling: Record<StageId, number>;
  litresTotal: number;
} {
  const mode = useMode();
  const live = useLive();
  if (mode === "live") return { mode, fouling: live.fouling, litresTotal: live.litres };
  return { mode, fouling: simulator.fouling, litresTotal: simulator.litresTotal };
}