import { useState, useEffect, useRef } from "react";
import { useReading } from "../data/source";
import { severityScore, SEVERITY_WEIGHTS } from "../model/severity";
import {
  Droplets,
  Waves,
  FlaskConical,
  Thermometer,
  Info,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { Reading } from "../types";
import WaterSeverityScore from "../components/WaterSeverityScore";

/* ------------------------------------------------------------------ */
/*  History                                                           */
/* ------------------------------------------------------------------ */

interface HistoryPoint {
  idx: number;
  tdsIn: number;
  turbidity: number;
  ph: number;
  temp: number;
}

const MAX_HISTORY = 60;

/* ------------------------------------------------------------------ */
/*  Severity gauge data                                               */
/* ------------------------------------------------------------------ */

function gaugeData(score: number) {
  // 180-degree arc split into colored zones + a remainder
  const clamped = Math.max(0, Math.min(100, score));
  return [
    { value: Math.min(clamped, 30), color: "#22c55e" },        // green 0-30
    { value: Math.max(0, Math.min(clamped - 30, 30)), color: "#f59e0b" }, // amber 30-60
    { value: Math.max(0, clamped - 60), color: "#ef4444" },    // red 60-100
    { value: 100 - clamped, color: "#1e3a5f" },                // unfilled
  ];
}

/* ------------------------------------------------------------------ */
/*  Reusable mini stat card                                           */
/* ------------------------------------------------------------------ */

interface MiniCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
}

function MiniCard({ icon, label, value, unit }: MiniCardProps) {
  return (
    <div className="bg-[#111d35] rounded-xl border border-[#1e3a5f] shadow p-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-gray-400 text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-semibold text-white">{value}</span>
        {unit && <span className="text-xs text-gray-400">{unit}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Trend chart wrapper                                               */
/* ------------------------------------------------------------------ */

interface TrendProps {
  title: string;
  data: HistoryPoint[];
  dataKey: keyof HistoryPoint;
  color: string;
  unit: string;
}

function TrendChart({ title, data, dataKey, color, unit }: TrendProps) {
  return (
    <div className="bg-[#111d35] rounded-xl border border-[#1e3a5f] shadow p-5 space-y-3">
      <h3 className="text-sm font-medium text-gray-300">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
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
            width={45}
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
              val != null ? `${Number(val).toFixed(2)} ${unit}` : "",
              title,
            ]}
            labelFormatter={(l) => `Reading ${l}`}
          />
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

export default function WaterQuality() {
  const reading = useReading();
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const idxRef = useRef(0);

  useEffect(() => {
    if (!reading) return;
    idxRef.current += 1;
    setHistory((prev) => {
      const next = [
        ...prev,
        {
          idx: idxRef.current,
          tdsIn: reading.tdsIn,
          turbidity: reading.turbidity,
          ph: reading.ph,
          temp: reading.temp,
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

  const score = severityScore(reading);
  const gData = gaugeData(score);

  const scoreColor =
  score <= 30
    ? "text-emerald-400"
    : score <= 60
    ? "text-amber-400"
    : "text-red-400";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Water Quality</h1>
        <p className="text-gray-400 text-sm mt-1">Inlet & outlet water parameters</p>
      </div>

      {/* Current values */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniCard
          icon={<Droplets className="w-3.5 h-3.5" />}
          label="TDS In"
          value={reading.tdsIn.toFixed(0)}
          unit="ppm"
        />
        <MiniCard
          icon={<Waves className="w-3.5 h-3.5" />}
          label="Turbidity"
          value={reading.turbidity.toFixed(2)}
          unit="NTU"
        />
        <MiniCard
          icon={<FlaskConical className="w-3.5 h-3.5" />}
          label="pH"
          value={reading.ph.toFixed(2)}
        />
        <MiniCard
          icon={<Thermometer className="w-3.5 h-3.5" />}
          label="Temperature"
          value={reading.temp.toFixed(1)}
          unit="°C"
        />
      </div>

      {/* Severity Gauge */}
      <div className="bg-[#111d35] rounded-xl border border-[#1e3a5f] shadow p-6 flex flex-col items-center">
        <h2 className="text-sm font-medium text-gray-300 mb-2">Water Severity Score</h2>

        <div className="relative w-56 h-32">
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={gData}
                cx="50%"
                cy="100%"
                startAngle={180}
                endAngle={0}
                innerRadius={70}
                outerRadius={95}
                dataKey="value"
                stroke="none"
                isAnimationActive={false}
              >
                {gData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
  <span className={`text-3xl font-bold ${scoreColor}`}>
    {score.toFixed(0)}
  </span>

  <p
    className={`text-sm font-semibold ${
      score <= 30
        ? "text-emerald-400"
        : score <= 60
        ? "text-amber-400"
        : "text-red-400"
    }`}
  >
    {score <= 30 ? "Healthy" : score <= 60 ? "Medium" : "Danger"}
  </p>
</div>
        </div>

        <p className="text-xs text-gray-500 mt-3 text-center max-w-xs">
          Composite score based on inlet water quality parameters
        </p>

        {/* Severity weights note */}
        <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-500">
          <Info className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          <span>
            Weights: Turbidity {SEVERITY_WEIGHTS.turbidity * 100}%, TDS{" "}
            {SEVERITY_WEIGHTS.tds * 100}%, pH {SEVERITY_WEIGHTS.ph * 100}%, Temp{" "}
            {SEVERITY_WEIGHTS.temp * 100}%
          </span>
        </div>
      </div>

      {/* Trend Charts */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Parameter Trends</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrendChart
            title="TDS (Input)"
            data={history}
            dataKey="tdsIn"
            color="#22d3ee"
            unit="ppm"
          />
          <TrendChart
            title="Turbidity"
            data={history}
            dataKey="turbidity"
            color="#a78bfa"
            unit="NTU"
          />
          <TrendChart
            title="pH"
            data={history}
            dataKey="ph"
            color="#34d399"
            unit=""
          />
          <TrendChart
            title="Temperature"
            data={history}
            dataKey="temp"
            color="#fbbf24"
            unit="°C"
          />
        </div>
      </div>
    </div>
  );
}
