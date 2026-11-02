import type { DataSource, PumpType, Reading, StageId } from "../types";
import { severityScore } from "../model/severity";
import { addFouling, DAILY_LITRES, loadIndexFromFouling } from "../model/remainingLife";
import { V_NOM } from "../model/load";

const BASE_CURRENT = 1.0;
const noise = (a: number) => (Math.random() - 0.5) * 2 * a;

export class Simulator implements DataSource {
  kind = "simulated" as const;
  controls = { turbidity: 3, temp: 27, pumpType: "DC" as PumpType, hoursPerTick: 6 };
  fouling: Record<StageId, number> = { sediment: 0.2, uf: 0.1, ro: 0.05 };
  litresTotal = 0;
  private listeners = new Set<(r: Reading) => void>();
  private timer?: ReturnType<typeof setInterval>;
  private spikeUntil = 0;

  monsoonSpike() { this.spikeUntil = Date.now() + 30_000; }
  setClogging(x: number) { (Object.keys(this.fouling) as StageId[]).forEach(k => (this.fouling[k] = x)); }
  reset() { this.fouling = { sediment: 0.2, uf: 0.1, ro: 0.05 }; this.litresTotal = 0; this.spikeUntil = 0; }
  get turbidityNow() { return Date.now() < this.spikeUntil ? 45 : this.controls.turbidity; }

  subscribe(cb: (r: Reading) => void) {
    this.listeners.add(cb);
    if (!this.timer) this.timer = setInterval(() => this.tick(), 1000);
    return () => {
      this.listeners.delete(cb);
      if (this.listeners.size === 0 && this.timer) { clearInterval(this.timer); this.timer = undefined; }
    };
  }

  private tick() {
    const c = this.controls;
    const base = { turbidity: this.turbidityNow, tdsIn: 420 + noise(8), ph: 7.1 + noise(0.05), temp: c.temp };
    const sev = severityScore(base);
    const litres = (DAILY_LITRES / 24) * c.hoursPerTick;
    (Object.keys(this.fouling) as StageId[]).forEach(id => {
      this.fouling[id] = Math.min(1.2, addFouling(this.fouling[id], id, litres, sev));
    });
    this.litresTotal += litres;

    const hli = loadIndexFromFouling(this.fouling);
    const voltage = V_NOM + noise(0.4);
    const avgF = (this.fouling.sediment + this.fouling.uf + this.fouling.ro) / 3;
    const reading: Reading = {
      ts: Date.now(),
      tdsIn: base.tdsIn,
      tdsOut: base.tdsIn * (0.08 + 0.1 * this.fouling.ro) + noise(2),
      temp: c.temp + noise(0.1),
      turbidity: base.turbidity + noise(0.15),
      ph: base.ph,
      flow: Math.max(0.05, 0.45 * (1 - 0.3 * avgF) * (1 + 0.025 * (c.temp - 25)) + noise(0.01)),
      current: BASE_CURRENT * hli * (voltage / V_NOM) + noise(0.01),
      voltage,
      pumpType: c.pumpType,
    };
    this.listeners.forEach(cb => cb(reading));
  }
}
