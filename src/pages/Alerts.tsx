import { useState } from "react";
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
import { hydraulicLoadIndex, normalisedCurrent, V_NOM } from "../model/load";
import {
  Info,
  AlertTriangle,
  OctagonAlert,
  Loader2,
  Droplet,
  X,
  Wrench,
  HelpCircle,
  ChevronDown,
  Gauge,
  Waves,
  CalendarClock,
  Sparkles,
} from "lucide-react";
import type { StageId, Reading } from "../types";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type AlertLevel = "info" | "warning" | "urgent";

interface AlertDiagnostics {
  hli: number;
  normCurrent: number;
  sev: number;
  turbidity: number;
  tdsIn: number;
  temp: number;
  ph: number;
  remLitres?: number;
  remDays?: number;
  hp?: number;
  stageName?: string;
  ratedLitres?: number;
  sensitivity?: number;
}

interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  stageName?: string;
  stageId?: StageId;
  diagnostics?: AlertDiagnostics;
}

/* ------------------------------------------------------------------ */
/*  Alert level config                                                */
/* ------------------------------------------------------------------ */

const LEVEL_CONFIG: Record<
  AlertLevel,
  { icon: React.ReactNode; bg: string; border: string; badge: string; badgeBg: string; label: string }
> = {
  info: {
    icon: <Info className="w-5 h-5" />,
    bg: "bg-cyan-500/5",
    border: "border-cyan-500/30",
    badge: "text-cyan-400",
    badgeBg: "bg-cyan-500/15",
    label: "Info",
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    bg: "bg-amber-500/5",
    border: "border-amber-500/30",
    badge: "text-amber-400",
    badgeBg: "bg-amber-500/15",
    label: "Warning",
  },
  urgent: {
    icon: <OctagonAlert className="w-5 h-5" />,
    bg: "bg-red-500/5",
    border: "border-red-500/30",
    badge: "text-red-400",
    badgeBg: "bg-red-500/15",
    label: "Urgent",
  },
};

/* ------------------------------------------------------------------ */
/*  DIY Replacement Modal                                             */
/* ------------------------------------------------------------------ */

function DIYModal({
  stageName,
  onClose,
}: {
  stageName: string;
  onClose: () => void;
}) {
  const steps = [
    "Turn off water supply and unplug purifier",
    "Release pressure by opening the nearest tap",
    `Locate the ${stageName} housing (refer to manual)`,
    "Twist housing counter-clockwise to remove",
    "Remove old cartridge and insert new one",
    "Hand-tighten housing back in place",
    "Turn on water supply and check for leaks",
    "Run 2-3 litres of water to flush the new cartridge",
    "Plug in purifier and verify flow rate",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative bg-[#111d35] border border-[#1e3a5f] rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-5">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400">
            <Wrench className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            DIY {stageName} Cartridge Replacement
          </h2>
        </div>

        {/* Steps */}
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/15 text-cyan-400 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-gray-300 pt-0.5">{step}</span>
            </li>
          ))}
        </ol>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#0a1628] border border-[#1e3a5f] text-gray-300 hover:text-white hover:border-cyan-500/50 transition-colors text-sm font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Alert Card                                                        */
/* ------------------------------------------------------------------ */

function AlertCard({
  alert,
  onDIY,
}: {
  alert: Alert;
  onDIY?: (stageName: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = LEVEL_CONFIG[alert.level];
  const diag = alert.diagnostics;

  return (
    <div
      className={`${cfg.bg} border ${cfg.border} rounded-xl p-5 space-y-3 transition-all duration-200`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${cfg.badge}`}>{cfg.icon}</div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${cfg.badgeBg} ${cfg.badge}`}
            >
              {cfg.label}
            </span>
            <span className="text-xs text-gray-500">Just now</span>
          </div>

          <h3 className="text-sm font-semibold text-white">{alert.title}</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            {alert.message}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="ml-8 flex items-center gap-3 flex-wrap pt-1">
        {/* "Why this alert?" Expander Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e3a5f] bg-[#0a1628]/70 text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/50 transition-all text-xs font-medium"
        >
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>Why this alert?</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {alert.stageName && onDIY && (
          <button
            onClick={() => onDIY(alert.stageName!)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 transition-colors text-xs font-medium"
          >
            <Wrench className="w-3.5 h-3.5" />
            Start DIY cartridge change
          </button>
        )}
      </div>

      {/* Expanded "Why this alert?" Diagnostic Breakdown */}
      {expanded && diag && (
        <div className="ml-8 mt-3 rounded-xl border border-[#1e3a5f] bg-[#0a1628] p-4 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#1e3a5f]/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Prognostics Derivation Steps
              </span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Simulated Model Calculation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Step 1: Pump Load Index */}
            <div className="rounded-lg border border-[#1e3a5f]/80 bg-[#111d35]/60 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] flex items-center justify-center font-bold">
                    1
                  </span>
                  Pump Load Index (HLI)
                </span>
                <span className="font-bold text-cyan-400">{diag.hli.toFixed(3)}×</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-tight">
                Normalised current = <strong>{diag.normCurrent.toFixed(3)} A</strong> @ 24V baseline.
                Indicates {((diag.hli - 1.0) * 100).toFixed(1)}% hydraulic backpressure on pump.
              </p>
            </div>

            {/* Step 2: Severity Score */}
            <div className="rounded-lg border border-[#1e3a5f]/80 bg-[#111d35]/60 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] flex items-center justify-center font-bold">
                    2
                  </span>
                  Water Severity Score
                </span>
                <span className="font-bold text-amber-400">{diag.sev} / 100</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-tight">
                Turbidity: <strong>{diag.turbidity.toFixed(1)} NTU</strong> (45%), TDS:{" "}
                <strong>{diag.tdsIn.toFixed(0)} ppm</strong> (25%), pH: {diag.ph.toFixed(1)}, Temp:{" "}
                {diag.temp.toFixed(0)}°C.
              </p>
            </div>

            {/* Step 3: Remaining Litres */}
            <div className="rounded-lg border border-[#1e3a5f]/80 bg-[#111d35]/60 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] flex items-center justify-center font-bold">
                    3
                  </span>
                  Remaining Litres
                </span>
                <span className="font-bold text-white">
                  {diag.remLitres !== undefined ? `${diag.remLitres.toLocaleString()} L` : "N/A"}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 leading-tight">
                Rated reference = {diag.ratedLitres?.toLocaleString() ?? 4000} L. Capacity ={" "}
                <strong>{diag.hp ?? 100}%</strong> after non-linear severity exponent scaling.
              </p>
            </div>

            {/* Step 4: Remaining Days */}
            <div className="rounded-lg border border-[#1e3a5f]/80 bg-[#111d35]/60 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] flex items-center justify-center font-bold">
                    4
                  </span>
                  Remaining Days
                </span>
                <span className="font-bold text-cyan-300">
                  {diag.remDays !== undefined ? `~${diag.remDays} days` : "Active"}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 leading-tight">
                Calculated at 25 L/day consumption. Triggers Warning at ≤ 21 days or Urgent at ≤ 7 days.
              </p>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 pt-1 border-t border-[#1e3a5f]/40 flex items-center justify-between">
            <span>Model: multi-stage exponential fouling with voltage invariance</span>
            <span className="text-cyan-400">Deterministic Simulated Telemetry</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Phone Mockup                                                      */
/* ------------------------------------------------------------------ */

function PhoneMockup({ alert }: { alert: Alert | null }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phone frame */}
      <div className="relative w-[320px] h-[568px] rounded-[2.5rem] border-4 border-[#1e3a5f] bg-[#0a1628] shadow-2xl overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#1e3a5f] rounded-b-2xl z-10" />

        {/* Screen content */}
        <div className="pt-10 px-4 h-full flex flex-col">
          {/* Title bar */}
          <div className="flex items-center gap-2 mb-6">
            <Droplet className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-semibold text-white">
              FilterPulse
            </span>
          </div>

          {/* Alert preview */}
          {alert ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                Latest Alert
              </p>
              <MobileAlertCard alert={alert} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-500">No active alerts</p>
            </div>
          )}

          {/* Bottom bar */}
          <div className="mt-auto pb-6 flex justify-center">
            <div className="w-32 h-1 rounded-full bg-[#1e3a5f]" />
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">Mobile alert notification preview</p>
    </div>
  );
}

function MobileAlertCard({ alert }: { alert: Alert }) {
  const cfg = LEVEL_CONFIG[alert.level];

  return (
    <div
      className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 space-y-2`}
    >
      <div className="flex items-center gap-2">
        <span className={cfg.badge}>{cfg.icon}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide ${cfg.badgeBg} ${cfg.badge}`}
        >
          {cfg.label}
        </span>
      </div>
      <h4 className="text-sm font-semibold text-white">{alert.title}</h4>
      <p className="text-[11px] text-gray-400 leading-relaxed">
        {alert.message}
      </p>
      <p className="text-[10px] text-gray-600">Just now</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Alert generation                                                  */
/* ------------------------------------------------------------------ */

function generateAlerts(
  fouling: Record<StageId, number>,
  sev: number,
  reading: Reading,
): Alert[] {
  const alerts: Alert[] = [];
  const stageIds = Object.keys(STAGES) as StageId[];

  const norm = normalisedCurrent(reading.current, reading.voltage);
  const hli = hydraulicLoadIndex(reading.current, reading.voltage, 1.0);

  for (const id of stageIds) {
    const stage = STAGES[id];
    const hp = healthPercent(fouling[id]);
    const litres = remainingLitres(fouling[id], id, sev);
    const days = remainingDays(litres);
    const s = status(days);

    const diag: AlertDiagnostics = {
      hli,
      normCurrent: norm,
      sev,
      turbidity: reading.turbidity,
      tdsIn: reading.tdsIn,
      temp: reading.temp,
      ph: reading.ph,
      remLitres: Math.round(litres),
      remDays: Number(days.toFixed(1)),
      hp,
      stageName: stage.name,
      ratedLitres: stage.litresAtRef,
      sensitivity: stage.sensitivity,
    };

    if (s === "warning") {
      alerts.push({
        id: `${id}-warning`,
        level: "warning",
        title: `${stage.name} Filter Warning`,
        message: `Replace ${stage.name.toLowerCase()} filter in ~${Math.round(days)} days. ${hp}% capacity remaining. Monitor water quality closely.`,
        stageName: stage.name,
        stageId: id,
        diagnostics: diag,
      });
    } else if (s === "urgent") {
      alerts.push({
        id: `${id}-urgent`,
        level: "urgent",
        title: `${stage.name} Filter — Replace Now`,
        message:
          id === "ro"
            ? `RO membrane requires immediate attention. Current rejection ratio may be degraded. Only ${hp}% capacity remaining.`
            : `${stage.name} filter approaching end of life. ${hp}% remaining capacity. Replace within ${Math.round(days)} days.`,
        stageName: stage.name,
        stageId: id,
        diagnostics: diag,
      });
    }
  }

  // General diagnostics for environmental/info alerts
  const envDiag: AlertDiagnostics = {
    hli,
    normCurrent: norm,
    sev,
    turbidity: reading.turbidity,
    tdsIn: reading.tdsIn,
    temp: reading.temp,
    ph: reading.ph,
  };

  // Turbidity alerts
  if (reading.turbidity > 30) {
    alerts.push({
      id: "turbidity-urgent",
      level: "urgent",
      title: "Very High Turbidity Detected",
      message: `Inlet turbidity at ${reading.turbidity.toFixed(1)} NTU — well above safe limits. Filter degradation may accelerate. Consider pre-treatment or flushing.`,
      diagnostics: envDiag,
    });
  } else if (reading.turbidity > 10) {
    alerts.push({
      id: "turbidity-warning",
      level: "warning",
      title: "Elevated Turbidity",
      message: `Inlet turbidity at ${reading.turbidity.toFixed(1)} NTU — higher than normal. Sediment filter load will increase. Inlet turbidity has been elevated this week.`,
      diagnostics: envDiag,
    });
  }

  // Info fallback
  if (alerts.length === 0) {
    alerts.push({
      id: "all-ok",
      level: "info",
      title: "All Systems Normal",
      message:
        "System monitoring active. All parameters within normal range.",
      diagnostics: envDiag,
    });
  }

  return alerts;
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function Alerts() {
  const reading = useReading();
  const [diyStage, setDIYStage] = useState<string | null>(null);

  if (!reading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const sev = severityScore(reading);
  const alerts = generateAlerts(
    simulator.fouling as Record<StageId, number>,
    sev,
    reading,
  );

  // Most urgent alert for phone mockup
  const priorityOrder: AlertLevel[] = ["urgent", "warning", "info"];
  const topAlert =
    priorityOrder
      .map((lvl) => alerts.find((a) => a.level === lvl))
      .find(Boolean) ?? alerts[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Alerts</h1>
        <p className="text-gray-400 text-sm mt-1">
          Real-time system alerts and maintenance guidance
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Alert list */}
        <div className="flex-1 space-y-4">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} onDIY={setDIYStage} />
          ))}
        </div>

        {/* Phone mockup */}
        <div className="flex-shrink-0 flex justify-center lg:justify-end">
          <PhoneMockup alert={topAlert} />
        </div>
      </div>

      {/* DIY Modal */}
      {diyStage && (
        <DIYModal stageName={diyStage} onClose={() => setDIYStage(null)} />
      )}
    </div>
  );
}
