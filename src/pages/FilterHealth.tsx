import { useState, useEffect, useRef } from "react";
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
import {
  normalisedFlow,
  slope,
  remainingLitresFromFlow,
  flowLossPer100L,
  T_REF,
  TEMP_COEFF,
  FLOW_LIMIT,
  CLEAN_FILTER_FLOW,
  getFallbackMode,
  setFallbackMode,
} from "../model/flowDecay";
import {
  Loader2,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  TrendingDown,
  Scale,
  Activity,
} from "lucide-react";
import type { StageId } from "../types";

/* ------------------------------------------------------------------ */
/*  Circular health gauge (SVG arc)                                   */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<"ok" | "warning" | "urgent", string> = {
  ok: "#22c55e",
  warning: "#f59e0b",
  urgent: "#ef4444",
};

function HealthRing({
  percent,
  statusLabel,
  isFallback = false,
}: {
  percent: number;
  statusLabel: "ok" | "warning" | "urgent";
  isFallback?: boolean;
}) {
  const size = 120;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = isFallback ? "#f59e0b" : STATUS_COLORS[statusLabel];

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
        y="46%"
        textAnchor="middle"
        dy="0.35em"
        fill={color}
        className="text-2xl font-bold"
        fontSize={28}
        fontWeight={700}
      >
        {percent}%
      </text>
      {isFallback && (
        <text
          x="50%"
          y="68%"
          textAnchor="middle"
          fill="#f59e0b"
          fontSize={9}
          fontWeight={600}
          className="uppercase tracking-wider"
        >
          Fallback
        </text>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                      */
/* ------------------------------------------------------------------ */

function StatusBadge({ s }: { s: "ok" | "warning" | "urgent" }) {
  const cfg = {
    ok: {
      label: "Healthy",
      bg: "bg-emerald-500/15",
      text: "text-emerald-400",
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
    warning: {
      label: "Monitor",
      bg: "bg-amber-500/15",
      text: "text-amber-400",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    urgent: {
      label: "Replace Soon",
      bg: "bg-red-500/15",
      text: "text-red-400",
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
    },
  }[s];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
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

interface FlowPoint {
  litres: number;
  normFlow: number;
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function FilterHealth() {
  const reading = useReading();
  const [fallbackActive, setFallbackActive] = useState(() => getFallbackMode());
  const [flowHistory, setFlowHistory] = useState<FlowPoint[]>([]);

  // Listen to cross-page fallback changes
  useEffect(() => {
    const handler = () => setFallbackActive(getFallbackMode());
    window.addEventListener("filterpulse_fallback_change", handler);
    return () => window.removeEventListener("filterpulse_fallback_change", handler);
  }, []);

  const toggleFallback = () => {
    const next = !fallbackActive;
    setFallbackMode(next);
    setFallbackActive(next);
  };

  // Track flow history for slope calculation
  useEffect(() => {
    if (!reading) return;
    const nFlow = normalisedFlow(reading.flow, reading.temp);
    setFlowHistory((prev) => {
      const next = [...prev, { litres: simulator.litresTotal, normFlow: nFlow }];
      return next.length > 60 ? next.slice(-60) : next;
    });
  }, [reading]);

  if (!reading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const sev = severityScore(reading);
  const stageIds = Object.keys(STAGES) as StageId[];

  // Compute flow decay slope from history
  const xs = flowHistory.map((p) => p.litres);
  const ys = flowHistory.map((p) => p.normFlow);
  const flowSlope = slope(xs, ys);
  const loss100L = flowLossPer100L(flowSlope);
  const currentNormFlow = normalisedFlow(reading.flow, reading.temp);

  // System-level remaining litres from flow
  let systemFlowRemLitres: number;
  if (flowSlope < -1e-7) {
    systemFlowRemLitres = remainingLitresFromFlow(currentNormFlow, FLOW_LIMIT, flowSlope);
  } else {
    // If slope is flat or starting, derive from current normalized flow fraction
    const flowSpan = Math.max(0.001, CLEAN_FILTER_FLOW - FLOW_LIMIT);
    const fractionLeft = Math.max(0, Math.min(1, (currentNormFlow - FLOW_LIMIT) / flowSpan));
    systemFlowRemLitres = fractionLeft * 10000;
  }

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Filter Health</h1>
          <p className="text-gray-400 text-sm mt-1">
            Multi-stage filter life estimation with dual-mode prognostic verification
          </p>
        </div>

        {/* Global Fallback Toggle Switch */}
        <div className="flex items-center gap-3 bg-[#111d35] border border-[#1e3a5f] p-2.5 px-4 rounded-xl shadow self-start sm:self-auto">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Fallback mode (pump signal weak)
            </span>
            <span className="text-[10px] text-gray-400">
              {fallbackActive
                ? "Active: Estimating life from flow slope only"
                : "Inactive: Using pump electrical signature"}
            </span>
          </div>

          <button
            onClick={toggleFallback}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              fallbackActive ? "bg-amber-500" : "bg-gray-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                fallbackActive ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Fallback Mode Active Banner */}
      {fallbackActive && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-950/20">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Fallback Mode Active (Simulated Sensor Dropout)
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Fallback Estimate
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed max-w-3xl">
                Simulating weak or disconnected pump current signal. Remaining filter life below is
                inferred solely from the <strong>permeate flow decay rate</strong> (
                <code className="text-amber-300">{loss100L.toFixed(4)} L/min lost per 100 L</code>),
                compensated for water temperature ({reading.temp.toFixed(1)}°C).
              </p>
            </div>
          </div>

          <button
            onClick={toggleFallback}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold shrink-0 border border-amber-500/40"
          >
            Switch to Pump Mode
          </button>
        </div>
      )}

      {/* Filter Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stageIds.map((id) => {
          const stage = STAGES[id];

          // 1. Pump-based primary calculation
          const fouling = simulator.fouling[id];
          const pumpHP = healthPercent(fouling);
          const pumpLitres = remainingLitres(fouling, id, sev);
          const pumpDays = remainingDays(pumpLitres);
          const pumpS = status(pumpDays);

          // 2. Flow-slope fallback calculation
          // Stage capacity scales relative to 10,000L baseline
          const stageRatio = stage.litresAtRef / 10000;
          const fallbackLitres = Math.max(0, systemFlowRemLitres * stageRatio);
          const fallbackDays = remainingDays(fallbackLitres);
          const fallbackHP = Math.min(
            100,
            Math.max(0, Math.round((fallbackLitres / stage.litresAtRef) * 100))
          );
          const fallbackS = status(fallbackDays);

          // Active values based on toggle
          const activeHP = fallbackActive ? fallbackHP : pumpHP;
          const activeLitres = fallbackActive ? fallbackLitres : pumpLitres;
          const activeDays = fallbackActive ? fallbackDays : pumpDays;
          const activeS = fallbackActive ? fallbackS : pumpS;

          return (
            <div
              key={id}
              className={`bg-[#111d35] rounded-2xl border p-6 flex flex-col items-center gap-4 transition-all duration-300 ${
                fallbackActive
                  ? "border-amber-500/40 shadow-lg shadow-amber-950/20"
                  : "border-[#1e3a5f] shadow"
              }`}
            >
              {/* Header with Stage Name & Fallback Label */}
              <div className="w-full flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">{stage.name}</h2>
                {fallbackActive ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Fallback estimate
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-gray-500">
                    Pump prognostics
                  </span>
                )}
              </div>

              {/* Circular gauge */}
              <HealthRing
                percent={activeHP}
                statusLabel={activeS}
                isFallback={fallbackActive}
              />

              {/* Stats */}
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Remaining litres</span>
                  <span className="text-white font-medium">
                    {fmt(Math.round(activeLitres))} L
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Remaining days</span>
                  <span className="text-white font-medium">
                    ~{Math.round(activeDays)} days
                  </span>
                </div>
              </div>

              {/* Status badge */}
              <StatusBadge s={activeS} />

              {/* Recommendation */}
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                {RECOMMENDATIONS[activeS]}
              </p>

              {/* Comparison Drawer (Always visible or enhanced during fallback) */}
              {fallbackActive && (
                <div className="w-full bg-[#0a1628] rounded-xl border border-amber-500/30 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-gray-300">
                    <span className="flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-amber-400" />
                      Prognostics Comparison
                    </span>
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      Simulated
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-amber-300 font-medium">
                      <span>Flow-Slope (Fallback):</span>
                      <span>
                        {fmt(Math.round(fallbackLitres))} L (~{Math.round(fallbackDays)}d)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-gray-400">
                      <span>Pump-Based Signature:</span>
                      <span className="text-gray-200">
                        {fmt(Math.round(pumpLitres))} L (~{Math.round(pumpDays)}d)
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1.5 border-t border-[#1e3a5f]/60">
                    <span>Estimator delta:</span>
                    <span className="text-cyan-400 font-medium">
                      {Math.abs(Math.round(fallbackDays - pumpDays))} days difference
                    </span>
                  </div>
                </div>
              )}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-400">
          <div>
            Daily usage estimate: <span className="text-white font-medium">{DAILY_LITRES} L/day</span>
          </div>
          <div>
            Flow decay threshold (FLOW_LIMIT):{" "}
            <span className="text-white font-medium">{FLOW_LIMIT.toFixed(3)} L/min</span> (0.7 × clean flow)
          </div>
        </div>

        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-300 text-xs leading-relaxed">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            ⚠️ Placeholder assumption — to be validated on bench rig. All rated litres, sensitivity exponents,
            permeability coefficients (TEMP_COEFF = {TEMP_COEFF}), and flow cutoffs are initial estimates
            derived from manufacturer datasheets and will be calibrated with accelerated fouling experiments.
          </span>
        </div>
      </div>
    </div>
  );
}
