import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { liveAgeMs, useLive, useMode } from "../data/live";

function ago(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 120 ? `${s}s` : `${Math.round(s / 60)} min`;
}

export default function SimBadge() {
  const mode = useMode();
  const live = useLive();
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (mode === "simulated") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5" />
        Simulated demo data
      </span>
    );
  }

  const age = liveAgeMs(live);
  if (live.status === "live" && age !== null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-400">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        Live · updated {ago(age)} ago
      </span>
    );
  }
  if (live.status === "offline" && age !== null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-400">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        Device offline · last data {ago(age)} ago
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-500/40 bg-gray-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-300">
      <span className="h-2 w-2 rounded-full bg-gray-400" />
      Live mode · no data
    </span>
  );
}