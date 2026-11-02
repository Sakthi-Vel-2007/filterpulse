import { AlertTriangle } from "lucide-react";

export default function SimBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-400">
      <AlertTriangle className="h-3.5 w-3.5" />
      Simulated Demo Data
    </span>
  );
}
