export const SEVERITY_WEIGHTS = { turbidity: 0.45, tds: 0.25, ph: 0.15, temp: 0.15 };
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function severityScore(r: {
  turbidity: number; tdsIn: number; ph: number; temp: number;
}): number {
  const w = SEVERITY_WEIGHTS;
  const s =
    w.turbidity * clamp01(r.turbidity / 50) +
    w.tds * clamp01(r.tdsIn / 1000) +
    w.ph * clamp01(Math.abs(r.ph - 7) / 3) +
    w.temp * clamp01(Math.abs(r.temp - 25) / 15);
  return Math.round(s * 100);
}
