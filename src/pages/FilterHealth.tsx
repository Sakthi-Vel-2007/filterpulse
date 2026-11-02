import { useReading, simulator } from "../data/source";
import {
  STAGES,
  DAILY_LITRES,
  healthPercent,
  remainingLitres,
  remainingDays,
  status,
} from "../model/remainingLife";
import { severityScore } from "../model/severity";
import { Loader2, ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import type { StageId } from "../types";

/* ------------------------------------------------------------------ */
/*  Circular health gauge (SVG arc)                                   */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<"ok" | "warning" | "urgent", string> = {
  ok: "#22c55e",
  warning: "#f59e0b",
  urgent: "#ef4444",
};

function HealthRing({ percent, statusLabel }: { percent: number; statusLabel: "ok" | "warning" | "urgent" }) {
  const size = 120;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = STATUS_COLORS[statusLabel];

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#1e3a5f"
        strokeWidth={stroke}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      {/* Center text */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy="0.35em"
        fill={color}
        className="text-2xl font-bold"
        fontSize={28}
        fontWeight={700}
      >
        {percent}%
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                      */
/* ------------------------------------------------------------------ */

function StatusBadge({ s }: { s: "ok" | "warning" | "urgent" }) {
  const cfg = {
    ok: { label: "Healthy", bg: "bg-emerald-500/15", text: "text-emerald-400", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    warning: { label: "Monitor", bg: "bg-amber-500/15", text: "text-amber-400", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    urgent: { label: "Replace Soon", bg: "bg-red-500/15", text: "text-red-400", icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  }[s];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Recommendations                                                   */
/* ------------------------------------------------------------------ */

const RECOMMENDATIONS: Record<"ok" | "warning" | "urgent", string> = {
  ok: "Filter operating within normal parameters",
  warning: "Plan replacement within 3 weeks. Monitor water quality.",
  urgent: "Replace immediately. Water quality may be compromised.",
};

/* ------------------------------------------------------------------ */
/*  Formatter                                                         */
/* ------------------------------------------------------------------ */

const fmt = (n: number) => n.toLocaleString("en-IN");

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function FilterHealth() {
  const reading = useReading();

  if (!reading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const sev = severityScore(reading);
  const stageIds = Object.keys(STAGES) as StageId[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Filter Health</h1>
        <p className="text-gray-400 text-sm mt-1">
          Multi-stage filter life estimation
        </p>
      </div>

      {/* Filter health cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stageIds.map((id) => {
          const stage = STAGES[id];
          const fouling = simulator.fouling[id];
          const hp = healthPercent(fouling);
          const litres = remainingLitres(fouling, id, sev);
          const days = remainingDays(litres);
          const s = status(days);

          return (
            <div
              key={id}
              className="bg-[#111d35] rounded-2xl border border-[#1e3a5f] shadow p-6 flex flex-col items-center gap-4"
            >
              {/* Stage name */}
              <h2 className="text-lg font-semibold text-white">{stage.name}</h2>

              {/* Circular gauge */}
              <HealthRing percent={hp} statusLabel={s} />

              {/* Stats */}
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Remaining litres</span>
                  <span className="text-white font-medium">{fmt(Math.round(litres))} L</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Remaining days</span>
                  <span className="text-white font-medium">{Math.round(days)} days</span>
                </div>
              </div>

              {/* Status badge */}
              <StatusBadge s={s} />

              {/* Recommendation */}
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                {RECOMMENDATIONS[s]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Assumptions panel */}
      <div className="bg-[#111d35] rounded-2xl border border-[#1e3a5f] shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Model Assumptions</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#1e3a5f] text-gray-400">
                <th className="py-2 pr-4 font-medium">Stage</th>
                <th className="py-2 pr-4 font-medium">Rated Litres</th>
                <th className="py-2 pr-4 font-medium">Sensitivity</th>
                <th className="py-2 font-medium">Load Weight</th>
              </tr>
            </thead>
            <tbody>
              {stageIds.map((id) => {
                const s = STAGES[id];
                return (
                  <tr key={id} className="border-b border-[#1e3a5f]/50">
                    <td className="py-2.5 pr-4 text-white">{s.name}</td>
                    <td className="py-2.5 pr-4 text-gray-300">{fmt(s.litresAtRef)} L</td>
                    <td className="py-2.5 pr-4 text-gray-300">{s.sensitivity}</td>
                    <td className="py-2.5 text-gray-300">{s.loadWeight}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="text-sm text-gray-400">
          Daily usage estimate: <span className="text-white font-medium">{DAILY_LITRES} L/day</span>
        </div>

        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-300 text-xs leading-relaxed">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            ⚠️ Placeholder assumption — to be validated on bench rig. All rated
            litres, sensitivity exponents, and load weights are initial estimates
            derived from manufacturer datasheets and will be calibrated with
            accelerated fouling experiments.
          </span>
        </div>
      </div>
    </div>
  );
}
