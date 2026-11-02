import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { simulator } from "../data/source";

export default function DemoControls() {
  const [open, setOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  const rerender = () => forceUpdate((n) => n + 1);

  const setTurbidity = (v: number) => {
    simulator.controls.turbidity = v;
    rerender();
  };
  const setTemp = (v: number) => {
    simulator.controls.temp = v;
    rerender();
  };
  const setClogging = (v: number) => {
    simulator.setClogging(v);
    rerender();
  };
  const setSpeed = (v: number) => {
    simulator.controls.hoursPerTick = v;
    rerender();
  };
  const togglePump = () => {
    simulator.controls.pumpType =
      simulator.controls.pumpType === "DC" ? "BLDC" : "DC";
    rerender();
  };

  /* ---------- collapsed fab ---------- */
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-[#0d1929] border border-[#1e3a5f] px-4 py-3 text-sm font-medium text-cyan-400 shadow-2xl hover:bg-[#12213a] transition-colors"
      >
        <SlidersHorizontal className="h-5 w-5" />
        <span className="hidden sm:inline">Demo Controls</span>
      </button>
    );
  }

  /* ---------- clogging display value (average of all fouling) ---------- */
  const cloggingValue =
    (simulator.fouling.sediment +
      simulator.fouling.uf +
      simulator.fouling.ro) /
    3;

  /* ---------- expanded panel ---------- */
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 max-h-[85vh] flex-col overflow-hidden rounded-xl border border-[#1e3a5f] bg-[#0d1929] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e3a5f] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🎛️</span>
          <span className="text-sm font-semibold text-white">
            Demo Controls
          </span>
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/30">
            Simulated Data
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Controls body */}
      <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4 scrollbar-thin">
        {/* Inlet Turbidity */}
        <SliderControl
          label="Inlet Turbidity"
          value={simulator.controls.turbidity}
          min={0}
          max={50}
          step={0.5}
          unit=" NTU"
          onChange={setTurbidity}
        />

        {/* Temperature */}
        <SliderControl
          label="Temperature (°C)"
          value={simulator.controls.temp}
          min={10}
          max={45}
          step={0.5}
          unit="°C"
          onChange={setTemp}
        />

        {/* Clogging */}
        <SliderControl
          label="Clogging Level"
          value={cloggingValue}
          min={0}
          max={1}
          step={0.01}
          displayValue={`${Math.round(cloggingValue * 100)}%`}
          onChange={setClogging}
        />

        {/* Time Speed */}
        <SliderControl
          label="Time Speed (hrs/tick)"
          value={simulator.controls.hoursPerTick}
          min={1}
          max={24}
          step={1}
          unit=" hrs"
          onChange={setSpeed}
        />

        {/* Pump Type Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">Pump Type</span>
          <button
            onClick={togglePump}
            className="flex items-center gap-1 rounded-lg border border-[#1e3a5f] bg-[#0a1628] px-1 py-1"
          >
            <span
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                simulator.controls.pumpType === "DC"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-gray-500"
              }`}
            >
              DC
            </span>
            <span
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                simulator.controls.pumpType === "BLDC"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-gray-500"
              }`}
            >
              BLDC
            </span>
          </button>
        </div>

        {/* Monsoon Spike */}
        <button
          onClick={() => {
            simulator.monsoonSpike();
            rerender();
          }}
          className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 transition-colors"
        >
          🌧️ Simulate Monsoon Spike
          <span className="block text-[10px] font-normal text-cyan-200/70">
            30s turbidity spike to 45 NTU
          </span>
        </button>

        {/* Reset */}
        <button
          onClick={() => {
            simulator.reset();
            rerender();
          }}
          className="w-full rounded-lg border border-[#1e3a5f] bg-transparent px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-white/5 transition-colors"
        >
          🔄 Reset Simulation
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reusable slider                                                    */
/* ------------------------------------------------------------------ */

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  displayValue?: string;
  onChange: (v: number) => void;
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  displayValue,
  onChange,
}: SliderProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        <span className="text-xs font-semibold text-cyan-400">
          {displayValue ?? `${value}${unit ?? ""}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#1e3a5f] accent-cyan-400
          [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md"
      />
    </div>
  );
}
