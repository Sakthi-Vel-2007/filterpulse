import { useState } from "react";
import { clearBaseline, recordBaseline, useLive, useMode } from "../data/live";
import { CAL } from "../model/physicsEstimate";

export default function BaselineCard() {
  const mode = useMode();
  const live = useLive();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const box = "rounded-2xl border border-[#1e3a5f] bg-[#111d35] p-4 space-y-3 text-sm";
  if (mode !== "live") {
    return (
      <div className={box}>
        <h2 className="font-semibold text-white">Clean-filter baseline</h2>
        <p className="text-xs text-gray-400">Switch to Live mode in the top bar to record a baseline.</p>
      </div>
    );
  }

  return (
    <div className={box}>
      <h2 className="font-semibold text-white">Clean-filter baseline</h2>
      <p className="text-xs text-gray-400">
        Fit new cartridges, run the pump for at least 5 minutes with water flowing, then press the button. The load
        index, fouling and remaining life are all measured against these values.
      </p>
      <div className="space-y-1 text-xs text-gray-300">
        <div>Clean normalised current: {CAL.cleanCurrent.toFixed(3)} A</div>
        <div>Clean flow at 25 °C: {CAL.cleanFlow.toFixed(3)} L/min</div>
        <div>Clean RO rejection: {CAL.rejClean.toFixed(1)}%</div>
        <div className="text-gray-400">
          {live.baselineAt
            ? `Recorded ${new Date(live.baselineAt).toLocaleString()}`
            : "Not recorded: these are placeholder values."}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMsg(recordBaseline())}
          className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/20"
        >
          Record clean-filter baseline now
        </button>
        {live.baselineAt > 0 && (
          <button
            onClick={() => {
              clearBaseline();
              setMsg(null);
            }}
            className="rounded-lg border border-[#1e3a5f] px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5"
          >
            Clear baseline
          </button>
        )}
      </div>
      {msg && <p className={`text-xs ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>}
    </div>
  );
}