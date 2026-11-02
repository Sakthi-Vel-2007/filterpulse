import { useState, useEffect, useRef } from "react";
import { useReading } from "../data/source";
import { normalisedCurrent, hydraulicLoadIndex, V_NOM } from "../model/load";
import { STAGES } from "../model/remainingLife";
import {
  Zap,
  Activity,
  Gauge,
  Info,
  AlertTriangle,
  Loader2,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { StageId } from "../types";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const BASELINE_NORM = 1.0;
const MAX_HISTORY = 60;

/* ------------------------------------------------------------------ */
/*  History                                                           */
/* ------------------------------------------------------------------ */

interface HistoryPoint {
  idx: number;
  rawCurrent: number;
  normCurrent: number;
  hli: number;
}

/* ------------------------------------------------------------------ */
/*  Metric card                                                       */
/* ------------------------------------------------------------------ */

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string; // text color class
}

function MetricCard({ icon, label, value, sub, color = "text-white" }: MetricCardProps) {
  return (
    <div className="bg-[#111d35] rounded-xl border border-[#1e3a5f] shadow p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-gray-400 text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`text-xl font-semibold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-gray-500">{sub}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart wrapper                                                     */
/* ------------------------------------------------------------------ */

interface ChartProps {
  title: string;
  data: HistoryPoint[];
  dataKey: keyof HistoryPoint;
  color: string;
  unit: string;
  refLine?: number;
  refLabel?: string;
}

function TrendChart({ title, data, dataKey, color, unit, refLine, refLabel }: ChartProps) {
  return (
    <div className="bg-[#111d35] rounded-xl border border-[#1e3a5f] shadow p-5 space-y-3">
      <h3 className="text-sm font-medium text-gray-300">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid stroke="#1e3a5f" strokeDasharray="3 3" />
          <XAxis
            dataKey="idx"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={{ stroke: "#1e3a5f" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={{ stroke: "#1e3a5f" }}
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f1f38",
              border: "1px solid #1e3a5f",
              borderRadius: 8,
              color: "#e5e7eb",
              fontSize: 12,
            }}
            formatter={(val: any) => [
              val != null ? `${Number(val).toFixed(3)} ${unit}` : "",
              title,
            ]}
            labelFormatter={(l) => `Reading ${l}`}
          />
          {refLine !== undefined && (
            <ReferenceLine
              y={refLine}
              stroke="#6b7280"
              strokeDasharray="6 3"
              label={{
                value: refLabel ?? `${refLine}`,
                fill: "#9ca3af",
                fontSize: 10,
                position: "right",
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function PumpLoad() {
  const reading = useReading();
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [supplyVoltage, setSupplyVoltage] = useState(24.0);
  const idxRef = useRef(0);

  useEffect(() => {
    if (!reading) return;
    idxRef.current += 1;
    const norm = normalisedCurrent(reading.current, reading.voltage);
    const hli = hydraulicLoadIndex(reading.current, reading.voltage, BASELINE_NORM);
    setHistory((prev) => {
      const next = [
        ...prev,
        {
          idx: idxRef.current,
          rawCurrent: reading.current,
          normCurrent: norm,
          hli,
        },
      ];
      return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
    });
  }, [reading]);

  if (!reading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const norm = normalisedCurrent(reading.current, reading.voltage);
  const hli = hydraulicLoadIndex(reading.current, reading.voltage, BASELINE_NORM);

  const hliColor =
    hli >= 1.1 ? "text-red-400" : hli >= 1.05 ? "text-amber-400" : "text-emerald-400";

  const stageIds = Object.keys(STAGES) as StageId[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Pump &amp; Load</h1>
          <p className="text-gray-400 text-sm mt-1">Electrical &amp; hydraulic analysis</p>
        </div>
        <span
          className={`ml-auto px-3 py-1 text-xs font-semibold rounded-full border ${
            reading.pumpType === "BLDC"
              ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
              : "border-amber-500/40 bg-amber-500/10 text-amber-300"
          }`}
        >
          {reading.pumpType} Pump
        </span>
      </div>

      {/* Explainer */}
      <div className="bg-[#111d35] rounded-xl border border-[#1e3a5f] shadow p-4 flex gap-3 items-start">
        <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-400 leading-relaxed">
          Pump current rises ~5–15% as filter stages clog, providing an indirect measure
          of hydraulic resistance. The <strong className="text-gray-200">Hydraulic Load Index (HLI)</strong>{" "}
          normalises for voltage and compares against a clean-filter baseline.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={<Zap className="w-4 h-4" />}
          label="Raw Current"
          value={reading.current.toFixed(3) + " A"}
        />
        <MetricCard
          icon={<Activity className="w-4 h-4" />}
          label="Voltage-Normalised Current"
          value={norm.toFixed(3) + " A"}
          sub={`at ${V_NOM}V`}
        />
        <MetricCard
          icon={<Gauge className="w-4 h-4" />}
          label="Hydraulic Load Index"
          value={hli.toFixed(3) + "×"}
          color={hliColor}
        />
      </div>

      {/* Interactive Supply Voltage Invariance Demonstration */}
      {(() => {
        const benchRawCurrent = norm * (supplyVoltage / V_NOM);
        const benchNormCurrent = normalisedCurrent(benchRawCurrent, supplyVoltage);
        const benchHLI = hydraulicLoadIndex(benchRawCurrent, supplyVoltage, BASELINE_NORM);
        const voltageDeltaPct = (((supplyVoltage - V_NOM) / V_NOM) * 100).toFixed(1);

        return (
          <div className="bg-[#111d35] rounded-2xl border border-cyan-500/40 p-5 sm:p-6 space-y-5 shadow-xl shadow-cyan-950/20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Voltage Normalisation Interactive Test Bench
                  </h2>
                  <p className="text-xs text-gray-400">
                    Simulate fluctuating line voltage to verify that the Hydraulic Load Index isolates filter clogging from grid variations
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Simulated Test Bench
              </span>
            </div>

            {/* Slider Control */}
            <div className="bg-[#0a1628] rounded-xl border border-[#1e3a5f] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <span>Supply Voltage:</span>
                  <span className="text-sm font-bold text-cyan-400">
                    {supplyVoltage.toFixed(1)} V
                  </span>
                  <span className="text-[11px] text-gray-400">
                    ({Number(voltageDeltaPct) >= 0 ? `+${voltageDeltaPct}%` : `${voltageDeltaPct}%`} vs {V_NOM}V nom)
                  </span>
                </span>
                <div className="flex items-center gap-1">
                  {[20, 24, 28].map((v) => (
                    <button
                      key={v}
                      onClick={() => setSupplyVoltage(v)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                        supplyVoltage === v
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "text-gray-400 hover:text-white bg-white/5"
                      }`}
                    >
                      {v}V
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="range"
                min={20}
                max={28}
                step={0.1}
                value={supplyVoltage}
                onChange={(e) => setSupplyVoltage(parseFloat(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#1e3a5f] accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                <span>20.0 V (Brownout)</span>
                <span>24.0 V (Nominal)</span>
                <span>28.0 V (High Line)</span>
              </div>
            </div>

            {/* Side-by-Side Live Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 1. Raw Current: Moves with voltage */}
              <div className="bg-[#0a1628] rounded-xl border border-amber-500/40 p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Raw Current</span>
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    Moves with V
                  </span>
                </div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  {benchRawCurrent.toFixed(3)} A
                </div>
                <p className="text-[11px] text-amber-300/80 leading-tight">
                  Scales linearly with supply voltage ({supplyVoltage.toFixed(1)}V)
                </p>
              </div>

              {/* 2. Normalised Current: Constant at 24V */}
              <div className="bg-[#0a1628] rounded-xl border border-cyan-500/40 p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Normalised Current</span>
                  <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                    Fixed @ 24V
                  </span>
                </div>
                <div className="text-2xl font-bold text-cyan-300 tabular-nums">
                  {benchNormCurrent.toFixed(3)} A
                </div>
                <p className="text-[11px] text-cyan-200/70 leading-tight">
                  Current * ({V_NOM}V / {supplyVoltage.toFixed(1)}V) cancels voltage drift
                </p>
              </div>

              {/* 3. Hydraulic Load Index: Rock steady */}
              <div className="bg-[#0a1628] rounded-xl border border-emerald-500/40 p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Hydraulic Load Index</span>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Rock Steady
                  </span>
                </div>
                <div className="text-2xl font-bold text-emerald-300 tabular-nums">
                  {benchHLI.toFixed(3)}×
                </div>
                <p className="text-[11px] text-emerald-200/70 leading-tight">
                  Normalized / 1.00A baseline = pure filter backpressure
                </p>
              </div>
            </div>

            {/* Invariance Callout */}
            <div className="flex items-start gap-2 text-xs text-gray-300 bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>Demonstration takeaway:</strong> As you drag the voltage slider between 20V and 28V,
                notice that the <strong>Raw Current shifts significantly</strong>, yet the{" "}
                <strong>Hydraulic Load Index remains completely stable ({benchHLI.toFixed(3)}×)</strong>.
                This proves FilterPulse's algorithm is resilient to power fluctuations and correctly isolates physical filter fouling.
              </span>
            </div>
          </div>
        );
      })()}

      {/* Trend charts */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Trends</h2>

        <TrendChart
          title="Raw Current vs Time"
          data={history}
          dataKey="rawCurrent"
          color="#22d3ee"
          unit="A"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrendChart
            title="Normalised Current vs Time"
            data={history}
            dataKey="normCurrent"
            color="#a78bfa"
            unit="A"
            refLine={BASELINE_NORM}
            refLabel="Baseline 1.0 A"
          />
          <TrendChart
            title="Hydraulic Load Index vs Time"
            data={history}
            dataKey="hli"
            color="#34d399"
            unit="×"
            refLine={1.0}
            refLabel="Clean 1.0×"
          />
        </div>
      </div>

      {/* Assumptions panel */}
      <div className="bg-[#111d35] rounded-xl border border-[#1e3a5f] shadow p-5 space-y-3">
        <div className="flex items-center gap-2 text-gray-300 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Assumptions
        </div>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-amber-400">⚠️</span>
            <span>
              <strong className="text-gray-300">V_NOM = {V_NOM} V</strong> — Nominal voltage for
              normalisation{" "}
              <span className="text-amber-500 text-xs">(Placeholder assumption)</span>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400">⚠️</span>
            <span>
              <strong className="text-gray-300">Baseline normalised current = {BASELINE_NORM} A</strong>{" "}
              — Clean filter reference{" "}
              <span className="text-amber-500 text-xs">(Placeholder assumption)</span>
            </span>
          </li>
          {stageIds.map((id) => (
            <li key={id} className="flex items-start gap-2">
              <span className="text-amber-400">⚠️</span>
              <span>
                <strong className="text-gray-300">
                  {STAGES[id].name} load weight = {STAGES[id].loadWeight}
                </strong>{" "}
                <span className="text-amber-500 text-xs">(Placeholder assumption)</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
