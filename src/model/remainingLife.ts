import type { StageId } from "../types";

export const DAILY_LITRES = 25;

export const STAGES: Record<StageId, {
  name: string; litresAtRef: number; sensitivity: number; loadWeight: number;
}> = {
  sediment: { name: "Sediment",    litresAtRef: 4000,  sensitivity: 2.0, loadWeight: 0.04 },
  uf:       { name: "UF",          litresAtRef: 10000, sensitivity: 1.5, loadWeight: 0.04 },
  ro:       { name: "RO membrane", litresAtRef: 20000, sensitivity: 1.0, loadWeight: 0.06 },
};

const severityFactor = (sev: number, id: StageId) =>
  Math.pow(0.5 + sev / 50, STAGES[id].sensitivity);

export const addFouling = (F: number, id: StageId, litres: number, sev: number) =>
  F + (litres / STAGES[id].litresAtRef) * severityFactor(sev, id);

export const remainingLitres = (F: number, id: StageId, sev: number) =>
  Math.max(0, ((1 - F) * STAGES[id].litresAtRef) / severityFactor(sev, id));

export const remainingDays = (litres: number) => litres / DAILY_LITRES;

export const healthPercent = (F: number) =>
  Math.round(Math.min(100, Math.max(0, (1 - F) * 100)));

export const status = (days: number): "ok" | "warning" | "urgent" =>
  days <= 7 ? "urgent" : days <= 21 ? "warning" : "ok";

export const loadIndexFromFouling = (F: Record<StageId, number>) =>
  1 + (Object.keys(STAGES) as StageId[]).reduce(
    (sum, id) => sum + STAGES[id].loadWeight * Math.min(1, F[id]), 0);
