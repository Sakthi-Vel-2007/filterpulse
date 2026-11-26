import { useEffect, useState } from "react";
import { useReading } from "../data/source";
import { liveAgeMs, useLive, useMode } from "../data/live";
import { getSensorRows } from "../model/sensorStatus";
import type { SensorState } from "../model/sensorStatus";

const STYLE: Record<SensorState, string> = {
  simulated: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  recorded: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  connected: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  offline: "bg-red-500/15 text-red-300 border-red-500/40",
};
const LABEL: Record<SensorState, string> = {
  simulated: "Simulated",
  recorded: "Recorded",
  connected: "Reporting",
  offline: "Offline",
};

export default function SensorStatusPanel() {
  const r = useReading();
  const mode = useMode();
  const live = useLive();
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!r) return null;

  const isLive = mode === "live";
  const age = isLive ? liveAgeMs(live) : null;
  // judge freshness with the server's clock, then hand a matching local timestamp to the model
  const lastTs = isLive ? (age === null ? null : Date.now() - age) : r.ts;
  const rows = getSensorRows(isLive ? "live" : "simulated", lastTs, r.pumpType);
  const secs = isLive ? (age === null ? null : Math.round(age / 1000)) : Math.max(0, Math.round((Date.now() - r.ts) / 1000));

  return (
    <section className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Sensors &amp; Data Source</h3>
        <span className="text-xs text-slate-400">
          Mode: {mode} · Pump: {r.pumpType}
          {secs !== null ? ` · last update ${secs}s ago` : ""}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="py-2 pr-3">Component</th>
              <th className="py-2 pr-3">Measures</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.component} className="border-t border-slate-800 text-slate-200">
                <td className="py-2 pr-3">{row.component}</td>
                <td className="py-2 pr-3 text-slate-400">{row.measures}</td>
                <td className="py-2 pr-3">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${STYLE[row.state]}`}>
                    {LABEL[row.state]}
                  </span>
                </td>
                <td className="py-2 text-slate-400">{row.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {isLive
          ? "Status shows whether the purifier has reported recently. It does not prove that each individual sensor is working or calibrated. Turbidity is an approximate trend, and pH drifts between calibrations."
          : "These readings come from a simulator. Live status appears only when a real purifier is reporting."}
      </p>
    </section>
  );
}
