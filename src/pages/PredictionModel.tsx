import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { simulator, useReading } from "../data/source";
import { severityScore } from "../model/severity";
import { STAGES, remainingDays, remainingLitres, status } from "../model/remainingLife";
import { CAL, blend, estimatePhysics, stageFouling } from "../model/physicsEstimate";
import type { PhysicsEstimate } from "../model/physicsEstimate";
import type { StageId } from "../types";

const IDS: StageId[] = ["sediment", "uf", "ro"];
const BAND = { normal: 1.05, watch: 1.1 }; // placeholder bands, to be validated on rig

const ST_CLS = {
  ok: "text-emerald-300",
  warning: "text-amber-300",
  urgent: "text-red-300",
} as const;

function hliBand(h: number) {
  if (h <= BAND.normal) return { label: "Normal", cls: "text-emerald-300" };
  if (h <= BAND.watch) return { label: "Watch", cls: "text-amber-300" };
  return { label: "Replace soon", cls: "text-red-300" };
}

function Box({ title, tag, children }: { title: string; tag?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        {tag && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
            {tag}
          </span>
        )}
      </div>
      <div className="space-y-2 text-sm text-slate-300">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-800 py-1 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

export default function PredictionModel() {
  const r = useReading();
  const [est, setEst] = useState<PhysicsEstimate | null>(null);

  useEffect(() => {
    if (!r) return;
    const raw = estimatePhysics({
      current: r.current,
      voltage: r.voltage,
      flow: r.flow,
      temp: r.temp,
      tdsIn: r.tdsIn,
      tdsOut: r.tdsOut,
    });
    setEst((prev) => (prev ? blend(prev, raw) : raw));
  }, [r]);

  if (!r || !est) return <div className="p-8 text-slate-400">Initialising sensors…</div>;

  const sev = severityScore({ turbidity: r.turbidity, tdsIn: r.tdsIn, ph: r.ph, temp: r.temp });
  const band = hliBand(est.hli);
  const F = stageFouling(est);
  const agree = Math.abs(est.fFlow - est.fPumpAvg) < 0.1;

  const rows = IDS.map((id) => {
    const litres = remainingLitres(F[id], id, sev);
    const days = remainingDays(litres);
    const trueDays = remainingDays(remainingLitres(simulator.fouling[id], id, sev));
    const errPct = trueDays > 0 ? ((days - trueDays) / trueDays) * 100 : 0;
    return { id, name: STAGES[id].name, fouling: F[id], litres, days, st: status(days), trueDays, errPct };
  });

  const worst = [...rows].sort((a, b) => a.days - b.days)[0];
  const d = Math.ceil(worst.days);
  const dirty = sev > 40 ? " Inlet water is dirty this week." : "";
  const message =
    worst.st === "urgent"
      ? `Replace ${worst.name} in ~${d} days.${dirty}`
      : worst.st === "warning"
      ? `${worst.name} needs attention in ~${d} days.${dirty}`
      : `All stages healthy. Next to watch: ${worst.name}, ~${d} days.`;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Prediction Model</h1>
        <p className="text-sm text-slate-400">
          How FilterPulse turns pump behaviour and water quality into remaining filter life.
          All values are simulated.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Box title="1. Inputs (live, simulated)">
          <p>
            Hydraulic Load Index:{" "}
            <span className="font-semibold text-white">{est.hli.toFixed(3)}</span>{" "}
            <span className={band.cls}>({band.label})</span>
          </p>
          <p className="text-xs text-slate-500">
            1.00 = clean filters. Bands are placeholders from the 5–15% current rise in the abstract.
          </p>
          <p>
            RO rejection ratio:{" "}
            <span className="font-semibold text-white">{est.rejectionPct.toFixed(1)}%</span>{" "}
            <span className="text-slate-400">
              ({(est.rejectionPct - CAL.rejClean).toFixed(1)} vs {CAL.rejClean}% placeholder baseline)
            </span>
          </p>
          <p>
            Water severity score: <span className="font-semibold text-white">{sev}</span> / 100
          </p>
        </Box>

        <Box title="2. Physics model" tag="Calculated live · placeholder constants">
          <div>
            <Row label="Normalised current" value={`${est.normCurrent.toFixed(3)} A`} />
            <Row label="Hydraulic load index" value={est.hli.toFixed(3)} />
            <Row label="Corrected flow (25 °C)" value={`${est.flow25.toFixed(3)} L/min`} />
            <Row label="Resistance index (R/R₀)" value={est.resistanceIdx.toFixed(3)} />
            <Row label="RO fouling" value={`${(est.fRo * 100).toFixed(0)}%`} />
            <Row label="Sediment + UF fouling" value={`${(est.fPre * 100).toFixed(0)}%`} />
            <Row
              label="Flow-decay cross-check"
              value={
                <span>
                  {(est.fFlow * 100).toFixed(0)}%{" "}
                  <span className={agree ? "text-emerald-300" : "text-amber-300"}>
                    ({agree ? "agrees" : "check sensors"})
                  </span>
                </span>
              }
            />
          </div>
          <p className="text-xs text-slate-500">
            Calculated from the signals only. Clean-filter constants are placeholders to be
            measured on the rig.
          </p>
        </Box>

        <Box title="3. ML correction" tag="Not trained yet">
          <p>Gradient-boosted regressor that learns the physics model&apos;s error.</p>
          <p className="text-slate-400">
            Planned inputs: load index (mean and trend), flow-decay slope, RO rejection, severity,
            temperature.
          </p>
          <p>
            Correction: <span className="font-semibold text-white">–</span>{" "}
            <span className="text-xs text-slate-500">needs controlled-clogging bench data</span>
          </p>
        </Box>
      </div>

      <Box title="4. Output: remaining life per stage" tag="Physics-only estimate (simulated)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-1 pr-3">Stage</th>
                <th className="py-1 pr-3">Est. fouling</th>
                <th className="py-1 pr-3">Remaining litres</th>
                <th className="py-1 pr-3">Remaining days</th>
                <th className="py-1 pr-3">Status</th>
                <th className="py-1 pr-3">Simulator truth (days)</th>
                <th className="py-1">Error</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="py-2 pr-3 text-white">{row.name}</td>
                  <td className="py-2 pr-3">{(row.fouling * 100).toFixed(0)}%</td>
                  <td className="py-2 pr-3">{Math.round(row.litres).toLocaleString()} L</td>
                  <td className="py-2 pr-3">{Math.round(row.days)} d</td>
                  <td className={`py-2 pr-3 font-medium ${ST_CLS[row.st]}`}>{row.st}</td>
                  <td className="py-2 pr-3 text-slate-400">{Math.round(row.trueDays)} d</td>
                  <td className="py-2 text-slate-400">
                    {row.errPct >= 0 ? "+" : ""}
                    {row.errPct.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          &quot;Simulator truth&quot; exists only in simulation. On the bench rig it is replaced by
          the pressure-transducer reference. Sediment and UF share one estimate because pump
          current alone cannot separate them.
        </p>
      </Box>

      <Box title="5. Alert sent to the app (example)">
        <p className={`text-base font-semibold ${ST_CLS[worst.st]}`}>{message}</p>
      </Box>
    </div>
  );
}