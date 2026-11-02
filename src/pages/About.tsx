import { AlertTriangle, ArrowRight, Activity, ShieldCheck, Cpu, Database, Wrench, Sparkles } from "lucide-react";

export default function About() {
  const targets = [
    {
      param: "Filter life prediction accuracy",
      baseline: "±30%",
      target: "±10%",
      notes: "Validated with accelerated fouling tests",
    },
    {
      param: "Pump current anomaly detection",
      baseline: "Manual inspection",
      target: "Automated alert",
      notes: "Within 5% false positive rate",
    },
    {
      param: "Water quality scoring",
      baseline: "None",
      target: "0–100 composite score",
      notes: "Weighted severity index (Turbidity, TDS, pH, Temp)",
    },
    {
      param: "DIY replacement support",
      baseline: "Service call required",
      target: "In-app guided flow",
      notes: "Reduce service dependency and turnaround time",
    },
    {
      param: "Alert lead time",
      baseline: "Reactive (post-failure)",
      target: "7–21 day advance warning",
      notes: "Based on trend extrapolation & hydraulic load index",
    },
  ];

  const roadmapPhases = [
    {
      phase: "Phase 1 (Current)",
      status: "In Progress",
      title: "Simulation & Proof of Concept",
      points: [
        "Pump-agnostic filter prognostics algorithm",
        "Multi-parameter water severity scoring (0–100)",
        "Hydraulic Load Index (HLI) model with voltage normalisation",
        "Interactive DIY cartridge replacement flow & mobile preview",
      ],
      active: true,
    },
    {
      phase: "Phase 2",
      status: "Upcoming",
      title: "Bench Validation",
      points: [
        "Hardware-in-the-loop test bench with ESP32 & sensors",
        "Real-time sensor ingestion (TDS, NTU, Flow, Current CT)",
        "Empirical calibration across DC & BLDC booster pumps",
        "Accelerated fouling stress tests with varying water profiles",
      ],
      active: false,
    },
    {
      phase: "Phase 3",
      status: "Planned",
      title: "Fleet Intelligence",
      points: [
        "Fleet learning of hyper-local municipal/borewell water profiles",
        "Predictive consumable supply chain & auto-dispatch integration",
        "Over-the-Air (OTA) prognostic model updates",
        "Service technician dispatch optimization",
      ],
      active: false,
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">About FilterPulse</h1>
        <p className="text-gray-400 text-sm mt-1">
          Pump-agnostic filter-failure prognostics for residential and commercial water purifiers
        </p>
      </div>

      {/* 1. System Architecture Block Diagram */}
      <div className="bg-[#111d35] rounded-2xl border border-[#1e3a5f] shadow p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            System Architecture &amp; Sensing Points
          </h2>
          <p className="text-gray-400 text-xs mt-1">
            Water treatment flow schematic showing instrumentation points for multi-stage prognostics
          </p>
        </div>

        {/* Flow Diagram */}
        <div className="overflow-x-auto py-4">
          <div className="min-w-[760px] flex items-center justify-between gap-2 px-2">
            {/* Stage 1: Raw Water Inlet */}
            <div className="flex flex-col items-center">
              <span className="mb-2 px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded">
                SENSORS: TDS, Turbidity, pH, Temp
              </span>
              <div className="w-32 h-20 rounded-xl bg-[#0a1628] border-2 border-cyan-500/40 p-3 flex flex-col justify-center items-center text-center shadow-lg">
                <span className="text-xs text-gray-400 font-medium">Inlet</span>
                <span className="text-sm font-bold text-white">Raw Water Feed</span>
              </div>
            </div>

            <ArrowRight className="w-5 h-5 text-cyan-400/60 shrink-0" />

            {/* Stage 2: Sediment + UF */}
            <div className="flex flex-col items-center">
              <span className="mb-2 h-5 text-[10px] text-gray-500 flex items-center">Pre-Filtration</span>
              <div className="w-32 h-20 rounded-xl bg-[#0a1628] border border-[#1e3a5f] p-3 flex flex-col justify-center items-center text-center shadow">
                <span className="text-xs text-cyan-400 font-medium">Stage 1 &amp; 2</span>
                <span className="text-sm font-bold text-white">Sediment + UF</span>
              </div>
            </div>

            <ArrowRight className="w-5 h-5 text-cyan-400/60 shrink-0" />

            {/* Stage 3: Booster Pump */}
            <div className="flex flex-col items-center">
              <span className="mb-2 px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded">
                SENSORS: Current, Voltage
              </span>
              <div className="w-36 h-20 rounded-xl bg-[#0a1628] border-2 border-cyan-400 p-3 flex flex-col justify-center items-center text-center shadow-lg shadow-cyan-950/40">
                <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Telemetry Core</span>
                <span className="text-sm font-bold text-white">Booster Pump</span>
                <span className="text-[10px] text-gray-400">DC or BLDC</span>
              </div>
            </div>

            <ArrowRight className="w-5 h-5 text-cyan-400/60 shrink-0" />

            {/* Stage 4: RO Membrane */}
            <div className="flex flex-col items-center">
              <span className="mb-2 px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded">
                SENSOR: Permeate TDS
              </span>
              <div className="w-32 h-20 rounded-xl bg-[#0a1628] border border-[#1e3a5f] p-3 flex flex-col justify-center items-center text-center shadow">
                <span className="text-xs text-cyan-400 font-medium">Stage 3</span>
                <span className="text-sm font-bold text-white">RO Membrane</span>
              </div>
            </div>

            <ArrowRight className="w-5 h-5 text-cyan-400/60 shrink-0" />

            {/* Stage 5: Post RO / Output */}
            <div className="flex flex-col items-center">
              <span className="mb-2 px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded">
                SENSOR: Flow Rate
              </span>
              <div className="w-32 h-20 rounded-xl bg-[#0a1628] border border-[#1e3a5f] p-3 flex flex-col justify-center items-center text-center shadow">
                <span className="text-xs text-emerald-400 font-medium">Post-Treatment</span>
                <span className="text-sm font-bold text-white">UV + Alkaliser</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-gray-400">
          <div className="bg-[#0a1628] p-3 rounded-xl border border-[#1e3a5f]/60">
            <span className="text-cyan-400 font-semibold block mb-1">1. Electrical Signatures</span>
            Normalised pump current tracks hydraulic backpressure buildup as sediment, UF, and RO membranes load.
          </div>
          <div className="bg-[#0a1628] p-3 rounded-xl border border-[#1e3a5f]/60">
            <span className="text-cyan-400 font-semibold block mb-1">2. Water Quality Context</span>
            Inlet TDS, turbidity, pH, and temp scale fouling velocity non-linearly using severity weighting.
          </div>
          <div className="bg-[#0a1628] p-3 rounded-xl border border-[#1e3a5f]/60">
            <span className="text-cyan-400 font-semibold block mb-1">3. Prognostics Output</span>
            Predicts exact remaining days and litres per stage rather than relying on crude fixed calendar timers.
          </div>
        </div>
      </div>

      {/* 2. Targets vs Baseline Table */}
      <div className="bg-[#111d35] rounded-2xl border border-[#1e3a5f] shadow p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Performance Targets vs Baseline
          </h2>
          <p className="text-gray-400 text-xs mt-1">
            Quantifiable improvements over legacy timer-based and reactive purifier servicing
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e3a5f] text-gray-400">
                <th className="py-3 px-4 font-semibold">Parameter</th>
                <th className="py-3 px-4 font-semibold">Industry Baseline</th>
                <th className="py-3 px-4 font-semibold text-cyan-400">FilterPulse Target</th>
                <th className="py-3 px-4 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3a5f]/50">
              {targets.map((row, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-medium text-white">{row.param}</td>
                  <td className="py-3 px-4 text-gray-400">{row.baseline}</td>
                  <td className="py-3 px-4 text-cyan-300 font-semibold">{row.target}</td>
                  <td className="py-3 px-4 text-gray-400 text-xs">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bench rig note */}
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">⚠️ Targets to be validated on bench rig</span>
        </div>
      </div>

      {/* 3. Roadmap Section */}
      <div className="bg-[#111d35] rounded-2xl border border-[#1e3a5f] shadow p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Project Roadmap
          </h2>
          <p className="text-gray-400 text-xs mt-1">
            From algorithmic simulation to fleet-scale distributed intelligence
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {roadmapPhases.map((phase, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-5 flex flex-col justify-between relative ${
                phase.active
                  ? "bg-[#0a1628] border-cyan-500/50 shadow-lg shadow-cyan-950/50"
                  : "bg-[#0a1628]/60 border-[#1e3a5f]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    {phase.phase}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      phase.active
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {phase.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-3">{phase.title}</h3>
                <ul className="space-y-2 text-xs text-gray-400">
                  {phase.points.map((pt, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2">
                      <span className="text-cyan-400 text-sm leading-none mt-0.5">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Safety Note */}
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 flex items-start gap-4">
        <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-red-300">Safety &amp; Operational Notice</h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            This application is a demonstration prototype. Do not use simulated predictions for actual filter replacement decisions. Always follow manufacturer guidelines and consult certified service personnel for water purifier maintenance.
          </p>
        </div>
      </div>

      {/* 5. Team & Track Info */}
      <div className="bg-[#111d35] rounded-2xl border border-[#1e3a5f] shadow p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            atomQUEST 2026 — Atomberg Technologies
          </span>
          <h3 className="text-lg font-bold text-white">Track 2: Water Purifier</h3>
          <p className="text-xs text-gray-400">
            Pump-agnostic filter-failure prognostics using electrical signature analysis
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right text-xs">
            <span className="text-gray-400 block">Status: Phase 1 Sim</span>
            <span className="text-emerald-400 font-semibold block">Ready for Bench Testing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
