import { useState, useEffect, useMemo, useRef } from "react";
import { useReading, simulator } from "../data/source";
import { severityScore } from "../model/severity";
import { normalisedCurrent, hydraulicLoadIndex, V_NOM } from "../model/load";
import {
  STAGES,
  remainingLitres,
  remainingDays,
  healthPercent,
  status,
} from "../model/remainingLife";
import type { StageId } from "../types";
import SimBadge from "../components/SimBadge";
import LoadingState from "../components/LoadingState";
import SensorStatusPanel from "../components/SensorStatusPanel";
import {
  Droplets,
  Droplet,
  Percent,
  Thermometer,
  Waves,
  FlaskConical,
  Gauge,
  Zap,
  BatteryCharging,
  Cpu,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Sparkline Component (pure SVG, ultra-fast & responsive)           */
/* ------------------------------------------------------------------ */

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

function Sparkline({
  data,
  color = "#22d3ee",
  height = 28,
  width = 84,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="rounded bg-cyan-950/20 border border-cyan-900/20 flex items-center justify-center text-[10px] text-gray-600"
      >
        •••
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 3;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 2 * pad) + pad;
      const y =
        height - pad - ((val - min) / range) * (height - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastPoint = points.split(" ").slice(-1)[0];
  const [lastX, lastY] = lastPoint ? lastPoint.split(",") : ["0", "0"];

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible shrink-0 select-none"
    >
      <defs>
        <filter id={`glow-${color.replace("#", "")}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor={color} floodOpacity="0.4" />
        </filter>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        filter={`url(#glow-${color.replace("#", "")})`}
      />
      {/* Current head dot */}
      <circle
        cx={lastX}
        cy={lastY}
        r="2.5"
        fill={color}
        className="animate-pulse"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Metric Card with Value, Unit, Status Dot & Sparkline              */
/* ------------------------------------------------------------------ */

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  statusColor?: "emerald" | "amber" | "red" | "cyan";
  sparkData: number[];
  sparkColor?: string;
  subtitle?: string;
}

function MetricCard({
  icon,
  label,
  value,
  unit,
  statusColor = "cyan",
  sparkData,
  sparkColor = "#22d3ee",
  subtitle,
}: MetricCardProps) {
  const dotColorClass = {
    emerald: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]",
    amber: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]",
    red: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.7)]",
    cyan: "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]",
  }[statusColor];

  return (
    <div className="group relative bg-[#111d35] rounded-2xl border border-[#1e3a5f] p-4 flex flex-col justify-between transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_4px_24px_rgba(6,182,212,0.12)] hover:-translate-y-0.5">
      {/* Top Header: Icon + Label + Status Dot */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0a1628] border border-[#1e3a5f] flex items-center justify-center text-cyan-400 group-hover:text-cyan-300 transition-colors">
            {icon}
          </div>
          <span className="text-xs font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
            {label}
          </span>
        </div>
        <span className={`w-2 h-2 rounded-full ${dotColorClass} shrink-0`} />
      </div>

      {/* Main Row: Value & Sparkline */}
      <div className="flex items-end justify-between gap-2 mt-1">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white tracking-tight tabular-nums">
              {value}
            </span>
            {unit && (
              <span className="text-xs font-semibold text-gray-400">
                {unit}
              </span>
            )}
          </div>
          {subtitle && (
            <span className="text-[10px] text-gray-500 block mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
        <div className="pb-1">
          <Sparkline data={sparkData} color={sparkColor} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component: Overview                                          */
/* ------------------------------------------------------------------ */

const BASELINE_NORM = 1.0;
const MAX_HISTORY = 30;

export default function Overview() {
  const reading = useReading();
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Maintain 30-tick histories for sparklines
  const [history, setHistory] = useState<{
    tdsIn: number[];
    turbidity: number[];
    temp: number[];
    ph: number[];
    tdsOut: number[];
    rejection: number[];
    flow: number[];
    current: number[];
    voltage: number[];
    hli: number[];
    litresTotal: number[];
  }>({
    tdsIn: [],
    turbidity: [],
    temp: [],
    ph: [],
    tdsOut: [],
    rejection: [],
    flow: [],
    current: [],
    voltage: [],
    hli: [],
    litresTotal: [],
  });

  const lastTsRef = useRef<number>(0);

  // Update history buffer on each reading
  useEffect(() => {
    if (!reading) return;
    lastTsRef.current = reading.ts;
    setSecondsAgo(0);

    const norm = normalisedCurrent(reading.current, reading.voltage);
    const hli = hydraulicLoadIndex(reading.current, reading.voltage, BASELINE_NORM);
    const rejection =
      reading.tdsIn > 0
        ? ((reading.tdsIn - reading.tdsOut) / reading.tdsIn) * 100
        : 0;

    setHistory((prev) => ({
      tdsIn: [...prev.tdsIn, reading.tdsIn].slice(-MAX_HISTORY),
      turbidity: [...prev.turbidity, reading.turbidity].slice(-MAX_HISTORY),
      temp: [...prev.temp, reading.temp].slice(-MAX_HISTORY),
      ph: [...prev.ph, reading.ph].slice(-MAX_HISTORY),
      tdsOut: [...prev.tdsOut, reading.tdsOut].slice(-MAX_HISTORY),
      rejection: [...prev.rejection, rejection].slice(-MAX_HISTORY),
      flow: [...prev.flow, reading.flow].slice(-MAX_HISTORY),
      current: [...prev.current, reading.current].slice(-MAX_HISTORY),
      voltage: [...prev.voltage, reading.voltage].slice(-MAX_HISTORY),
      hli: [...prev.hli, hli].slice(-MAX_HISTORY),
      litresTotal: [...prev.litresTotal, simulator.litresTotal].slice(-MAX_HISTORY),
    }));
  }, [reading]);

  // Live timer for "Last updated Ns ago"
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute model prognostic metrics
  const prognostics = useMemo(() => {
    if (!reading) return null;
    const sev = severityScore(reading);
    const stageIds: StageId[] = ["sediment", "uf", "ro"];

    const stages = stageIds.map((id) => {
      const f = simulator.fouling[id];
      const hp = healthPercent(f);
      const remL = remainingLitres(f, id, sev);
      const remD = remainingDays(remL);
      const st = status(remD);
      return {
        id,
        name: STAGES[id].name,
        fouling: f,
        hp,
        remLitres: remL,
        remDays: remD,
        status: st,
      };
    });

    // Find the next filter requiring replacement (least remaining days)
    const sorted = [...stages].sort((a, b) => a.remDays - b.remDays);
    const nextReplacement = sorted[0];

    // Determine overall system status
    let overall: "Normal" | "Warning" | "Urgent" = "Normal";
    if (stages.some((s) => s.status === "urgent")) {
      overall = "Urgent";
    } else if (stages.some((s) => s.status === "warning")) {
      overall = "Warning";
    }

    const norm = normalisedCurrent(reading.current, reading.voltage);
    const hli = hydraulicLoadIndex(reading.current, reading.voltage, BASELINE_NORM);
    const rejection =
      reading.tdsIn > 0
        ? ((reading.tdsIn - reading.tdsOut) / reading.tdsIn) * 100
        : 0;

    return {
      sev,
      stages,
      nextReplacement,
      overall,
      hli,
      norm,
      rejection,
    };
  }, [reading]);

  if (!reading || !prognostics) {
    return <LoadingState />;
  }

  const { sev, stages, nextReplacement, overall, hli, rejection } =
    prognostics;

  // Hero status bar configuration
  const heroConfig = {
    Normal: {
      badgeBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
      border: "border-emerald-500/40",
      accent: "text-emerald-400",
      glow: "shadow-[0_0_30px_rgba(16,185,129,0.12)]",
      icon: <ShieldCheck className="w-7 h-7 text-emerald-400 shrink-0" />,
      summary: `All 3 filter stages healthy. Next scheduled service: ${nextReplacement.name} in ~${Math.round(
        nextReplacement.remDays
      )} days.`,
    },
    Warning: {
      badgeBg: "bg-amber-500/20 text-amber-400 border-amber-500/40",
      border: "border-amber-500/40",
      accent: "text-amber-400",
      glow: "shadow-[0_0_30px_rgba(245,158,11,0.12)]",
      icon: <AlertTriangle className="w-7 h-7 text-amber-400 shrink-0" />,
      summary: `${nextReplacement.name} filter needs attention in ~${Math.max(
        1,
        Math.round(nextReplacement.remDays)
      )} days (${nextReplacement.hp}% health). Plan replacement cartridge.`,
    },
    Urgent: {
      badgeBg: "bg-red-500/20 text-red-400 border-red-500/40",
      border: "border-red-500/40",
      accent: "text-red-400",
      glow: "shadow-[0_0_30px_rgba(239,68,68,0.15)]",
      icon: <ShieldAlert className="w-7 h-7 text-red-400 shrink-0" />,
      summary: `Critical Action Required: ${nextReplacement.name} filter degraded (~${Math.max(
        0,
        Math.round(nextReplacement.remDays)
      )} days remaining). Replacement immediately advised.`,
    },
  }[overall];

  // Water Severity color & label
  const sevColor =
    sev < 30 ? "#10b981" : sev < 60 ? "#f59e0b" : "#ef4444";
  const sevLabel =
    sev < 30 ? "Favorable" : sev < 60 ? "Elevated" : "Severe Stress";

  // HLI color & label
  const hliColor =
    hli < 1.05 ? "text-emerald-400" : hli < 1.1 ? "text-amber-400" : "text-red-400";
  const hliPctChange = ((hli - 1.0) * 100).toFixed(1);

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-300">
      {/* ============================================================ */}
      {/* 1. HERO STATUS BAR (Full Width)                              */}
      {/* ============================================================ */}
      <section
        className={`relative overflow-hidden rounded-2xl border ${heroConfig.border} bg-[#111d35] p-5 sm:p-6 ${heroConfig.glow} transition-all duration-300`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Left: Overall Status + Icon + Summary */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3 rounded-xl bg-[#0a1628] border border-[#1e3a5f] shrink-0">
              {heroConfig.icon}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  System Prognostics State
                </span>
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${heroConfig.badgeBg}`}
                >
                  {overall}
                </span>
              </div>
              <p className="text-base sm:text-lg font-semibold text-white leading-snug">
                {heroConfig.summary}
              </p>
            </div>
          </div>

          {/* Right: Telemetry metadata & Simulated Badge */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap self-end lg:self-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a1628] border border-[#1e3a5f] text-xs text-gray-400">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Updated <strong className="text-white">{secondsAgo}s</strong> ago
              </span>
            </div>
            <SimBadge />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. TOP ROW: 3 Large Feature Cards                            */}
      {/* ============================================================ */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Feature 1: Water Severity Score */}
        <div className="group bg-[#111d35] rounded-2xl border border-[#1e3a5f] p-5 flex flex-col justify-between hover:border-cyan-500/50 hover:shadow-[0_4px_24px_rgba(6,182,212,0.12)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Water Severity Score
            </span>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
              style={{
                color: sevColor,
                borderColor: `${sevColor}40`,
                backgroundColor: `${sevColor}15`,
              }}
            >
              {sevLabel}
            </span>
          </div>

          <div className="flex items-center justify-center gap-6 my-3">
            {/* Circular Gauge */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg width="112" height="112" className="transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="44"
                  stroke="#1e3a5f"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="44"
                  stroke={sevColor}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={
                    2 * Math.PI * 44 * (1 - Math.min(100, Math.max(0, sev)) / 100)
                  }
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {sev}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">/ 100</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-gray-400">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-400">Turbidity (45%):</span>
                <span className="text-white font-medium">{reading.turbidity.toFixed(1)} NTU</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-400">TDS (25%):</span>
                <span className="text-white font-medium">{reading.tdsIn.toFixed(0)} ppm</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-400">pH / Temp (30%):</span>
                <span className="text-white font-medium">
                  {reading.ph.toFixed(1)} / {reading.temp.toFixed(0)}°C
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1e3a5f]/60 text-[11px] text-gray-400 flex items-center justify-between">
            <span>Inlet stress factor</span>
            <span className="text-cyan-400 font-medium">Non-linear fouling scaling</span>
          </div>
        </div>

        {/* Feature 2: Hydraulic Load Index */}
        <div className="group bg-[#111d35] rounded-2xl border border-[#1e3a5f] p-5 flex flex-col justify-between hover:border-cyan-500/50 hover:shadow-[0_4px_24px_rgba(6,182,212,0.12)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Hydraulic Load Index
            </span>
            <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full">
              {reading.pumpType} Signature
            </span>
          </div>

          <div className="my-3 space-y-2">
            <div className="flex items-baseline justify-between">
              <div>
                <span className={`text-3xl font-extrabold tracking-tight ${hliColor}`}>
                  {hli.toFixed(3)}×
                </span>
                <span className="text-xs text-gray-400 ml-2">
                  ({Number(hliPctChange) >= 0 ? `+${hliPctChange}%` : `${hliPctChange}%`})
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>30-reading trend</span>
              </div>
            </div>

            {/* Sparkline for HLI */}
            <div className="h-10 w-full flex items-center justify-end">
              <Sparkline
                data={history.hli}
                color={hli >= 1.1 ? "#ef4444" : hli >= 1.05 ? "#f59e0b" : "#22d3ee"}
                height={36}
                width={220}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#1e3a5f]/60 text-[11px] text-gray-400 flex items-center justify-between">
            <span className="text-gray-400 font-medium">1.00 = clean filters baseline</span>
            <span className="text-gray-500">Norm @ {V_NOM}V</span>
          </div>
        </div>

        {/* Feature 3: Next Replacement */}
        <div className="group bg-[#111d35] rounded-2xl border border-[#1e3a5f] p-5 flex flex-col justify-between hover:border-cyan-500/50 hover:shadow-[0_4px_24px_rgba(6,182,212,0.12)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Next Stage Due
            </span>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                nextReplacement.status === "urgent"
                  ? "bg-red-500/15 text-red-400 border-red-500/30"
                  : nextReplacement.status === "warning"
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              }`}
            >
              {nextReplacement.status === "urgent"
                ? "Urgent"
                : nextReplacement.status === "warning"
                ? "Monitor"
                : "Nominal"}
            </span>
          </div>

          <div className="my-3 space-y-1">
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span>{nextReplacement.name}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                ~{Math.max(0, Math.round(nextReplacement.remDays))}
              </span>
              <span className="text-sm font-semibold text-gray-400">days left</span>
            </div>
            <div className="text-xs text-gray-400 flex items-center justify-between pt-1">
              <span>Remaining Capacity:</span>
              <span className="text-cyan-300 font-medium">
                {nextReplacement.hp}% ({Math.round(nextReplacement.remLitres).toLocaleString()} L)
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1e3a5f]/60 text-[11px] text-gray-400 flex items-center justify-between">
            <span>Prognostic priority #1</span>
            <span className="text-cyan-400 font-medium">Auto-calculated</span>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. FILTER LIFE STRIP (Sediment, UF, RO membrane)              */}
      {/* ============================================================ */}
      <section className="bg-[#111d35] rounded-2xl border border-[#1e3a5f] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Filter Life Prognostics Strip
            </h2>
          </div>
          <span className="text-xs text-gray-400">
            Real-time stage-wise degradation based on hydraulic backpressure &amp; water severity
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
          {stages.map((st) => {
            const barGradient = {
              ok: "from-emerald-500 to-teal-400",
              warning: "from-amber-500 to-yellow-400",
              urgent: "from-red-500 to-rose-400",
            }[st.status];

            const statusText = {
              ok: "Healthy",
              warning: "Plan Change",
              urgent: "Replace Now",
            }[st.status];

            const statusBadgeColor = {
              ok: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
              warning: "text-amber-400 bg-amber-500/10 border-amber-500/30",
              urgent: "text-red-400 bg-red-500/10 border-red-500/30",
            }[st.status];

            return (
              <div
                key={st.id}
                className="bg-[#0a1628] rounded-xl border border-[#1e3a5f]/80 p-4 space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{st.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeColor}`}
                  >
                    {statusText}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="h-2.5 w-full bg-[#111d35] rounded-full overflow-hidden border border-[#1e3a5f]">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700`}
                      style={{ width: `${st.hp}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{st.hp}% Health</span>
                    <span className="text-gray-400">
                      ~{Math.max(0, Math.round(st.remDays))} days
                    </span>
                  </div>
                </div>

                {/* Litres info */}
                <div className="pt-2 border-t border-[#1e3a5f]/40 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Remaining volume:</span>
                  <span className="text-gray-200 font-medium">
                    {Math.round(st.remLitres).toLocaleString()} L
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. THREE GROUPED SECTIONS (Inlet, Purified, Pump)             */}
      {/* ============================================================ */}

      {/* Group A: Inlet Water */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Waves className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">
            Inlet Water Telemetry
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<Droplets className="w-4 h-4" />}
            label="Input TDS"
            value={reading.tdsIn.toFixed(0)}
            unit="ppm"
            statusColor={reading.tdsIn > 600 ? "amber" : "emerald"}
            sparkData={history.tdsIn}
            sparkColor="#22d3ee"
            subtitle="Raw feed mineral content"
          />
          <MetricCard
            icon={<Waves className="w-4 h-4" />}
            label="Turbidity"
            value={reading.turbidity.toFixed(2)}
            unit="NTU"
            statusColor={
              reading.turbidity > 15
                ? "red"
                : reading.turbidity > 5
                ? "amber"
                : "emerald"
            }
            sparkData={history.turbidity}
            sparkColor="#a78bfa"
            subtitle="Particulate suspension"
          />
          <MetricCard
            icon={<Thermometer className="w-4 h-4" />}
            label="Temperature"
            value={reading.temp.toFixed(1)}
            unit="°C"
            statusColor="cyan"
            sparkData={history.temp}
            sparkColor="#fbbf24"
            subtitle="Feed stream temperature"
          />
          <MetricCard
            icon={<FlaskConical className="w-4 h-4" />}
            label="pH"
            value={reading.ph.toFixed(2)}
            statusColor={
              reading.ph < 6.5 || reading.ph > 8.5 ? "amber" : "emerald"
            }
            sparkData={history.ph}
            sparkColor="#34d399"
            subtitle="Acidity / alkalinity"
          />
        </div>
      </section>

      {/* Group B: Purified Water */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Droplet className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">
            Purified Water Telemetry
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            icon={<Droplet className="w-4 h-4" />}
            label="Output TDS"
            value={reading.tdsOut.toFixed(0)}
            unit="ppm"
            statusColor={reading.tdsOut > 100 ? "amber" : "emerald"}
            sparkData={history.tdsOut}
            sparkColor="#38bdf8"
            subtitle="Permeate quality"
          />
          <MetricCard
            icon={<Percent className="w-4 h-4" />}
            label="RO Rejection Ratio"
            value={rejection.toFixed(1)}
            unit="%"
            statusColor={rejection < 85 ? "amber" : "emerald"}
            sparkData={history.rejection}
            sparkColor="#34d399"
            subtitle="Membrane salt rejection"
          />
          <MetricCard
            icon={<Gauge className="w-4 h-4" />}
            label="Flow Rate"
            value={reading.flow.toFixed(2)}
            unit="L/min"
            statusColor={reading.flow < 0.25 ? "amber" : "emerald"}
            sparkData={history.flow}
            sparkColor="#a78bfa"
            subtitle="Permeate production rate"
          />
        </div>
      </section>

      {/* Group C: Booster Pump */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">
            Booster Pump Telemetry &amp; Signature
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<Zap className="w-4 h-4" />}
            label="Pump Current"
            value={reading.current.toFixed(3)}
            unit="A"
            statusColor="cyan"
            sparkData={history.current}
            sparkColor="#22d3ee"
            subtitle="Electrical signature"
          />
          <MetricCard
            icon={<BatteryCharging className="w-4 h-4" />}
            label="Pump Voltage"
            value={reading.voltage.toFixed(1)}
            unit="V"
            statusColor="cyan"
            sparkData={history.voltage}
            sparkColor="#fbbf24"
            subtitle={`Nominal baseline: ${V_NOM}V`}
          />
          <div className="group relative bg-[#111d35] rounded-2xl border border-[#1e3a5f] p-4 flex flex-col justify-between transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_4px_24px_rgba(6,182,212,0.12)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0a1628] border border-[#1e3a5f] flex items-center justify-center text-cyan-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-gray-400">Pump Architecture</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
            </div>
            <div className="mt-1">
              <span className="text-2xl font-bold text-white tracking-tight">
                {reading.pumpType}
              </span>
              <span className="text-xs text-gray-400 ml-1.5 font-medium">Motor</span>
              <span className="text-[10px] text-gray-500 block mt-0.5">
                Pump-agnostic signature normalization
              </span>
            </div>
          </div>
          <MetricCard
            icon={<ArrowUpRight className="w-4 h-4" />}
            label="Litres Processed"
            value={simulator.litresTotal.toFixed(0)}
            unit="L"
            statusColor="cyan"
            sparkData={history.litresTotal}
            sparkColor="#34d399"
            subtitle="Cumulative through lifecycle"
          />
        </div>
      </section>

      {/* Sensors & Data Source */}
      <SensorStatusPanel />
    </div>
  );
}
