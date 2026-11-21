import { useState } from "react";

interface Props {
  level: "info" | "warning" | "urgent";
  stage: "sediment" | "uf" | "ro";
  days: number;
}

export default function SendAlertButton({ level, stage, days }: Props) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function send() {
    setState("sending");
    try {
      const res = await fetch("/api/notify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, stage, days: Math.round(days) }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <button
        onClick={send}
        disabled={state === "sending"}
        className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : "Send this alert by email (demo)"}
      </button>
      {state === "sent" && <span className="text-xs text-emerald-300">Sent. Check spam too.</span>}
      {state === "error" && (
        <span className="text-xs text-red-300">
          Could not send. This works on the deployed site only.
        </span>
      )}
    </div>
  );
}