import { useEffect, useState } from "react";
import { Simulator } from "./simulator";
import type { DataSource, Reading } from "../types";

export const simulator = new Simulator();
export const activeSource: DataSource = simulator;

export function useReading(src: DataSource = activeSource) {
  const [r, setR] = useState<Reading | null>(null);
  useEffect(() => src.subscribe(setR), [src]);
  return r;
}
