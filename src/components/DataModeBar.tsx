import { selectDevice, setMode, useLive, useMode } from "../data/live";

export default function DataModeBar() {
  const mode = useMode();
  const live = useLive();
  const btn = (active: boolean) =>
    `rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
      active ? "bg-cyan-500/20 text-cyan-300" : "text-gray-500 hover:text-gray-300"
    }`;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-[#1e3a5f] bg-[#0a1628] p-0.5">
        <button className={btn(mode === "simulated")} onClick={() => setMode("simulated")}>
          Simulated
        </button>
        <button className={btn(mode === "live")} onClick={() => setMode("live")}>
          Live
        </button>
      </div>
      {mode === "live" && live.devices.length > 1 && (
        <select
          value={live.deviceId}
          onChange={(e) => selectDevice(e.target.value)}
          className="rounded-lg border border-[#1e3a5f] bg-[#0a1628] px-2 py-1 text-xs text-white"
        >
          {live.devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.id}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}