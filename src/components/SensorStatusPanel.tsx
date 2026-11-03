
import { useReading } from "../data/source";
import { getSensorRows } from "../model/sensorStatus";
import type { DataMode, SensorState } from "../model/sensorStatus";

const STYLE: Record<SensorState, string> = {
  simulated: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  recorded: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  connected: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  offline: "bg-red-500/15 text-red-300 border-red-500/40",
};
const LABEL: Record<SensorState, string> = {
  simulated: "Simulated",
  recorded: "Recorded",
  connected: "Connected",
  offline: "Offline",
};

export default function SensorStatusPanel() {
  const r = useReading();
  const mode: DataMode = "simulated"; // becomes dynamic when Live mode is added
  if (!r) return null;

  const rows = getSensorRows(mode, r.ts, r.pumpType);
  const secs = Math.max(0, Math.round((Date.now() - r.ts) / 1000));

  return (
    <section className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Sensors &amp; Data Source</h3>
        <span className="text-xs text-slate-400">
          Mode: {mode} · Pump: {r.pumpType} · last update {secs}s ago
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
        These readings come from a simulator. &quot;Connected&quot; appears only when real hardware
        data is arriving.
      </p>
    </section>
  );
}