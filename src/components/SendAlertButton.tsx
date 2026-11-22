import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

interface Props {
  level: "info" | "warning" | "urgent";
  stage: "sediment" | "uf" | "ro";
  days: number;
}

export default function SendAlertButton({ level, stage, days }: Props) {
  const { user, enabled } = useAuth();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [detail, setDetail] = useState("");

  if (!user) {
    return (
      <p className="pt-2 text-xs text-gray-400">
        {enabled ? (
          <>
            <Link to="/purifier" className="text-cyan-300 underline">
              Sign in on My Purifier
            </Link>{" "}
            to get this demo alert by email.
          </>
        ) : (
          "Sign-in is not configured on this build."
        )}
      </p>
    );
  }

  async function send() {
    if (!user) return;
    setState("sending");
    setDetail("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/notify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ level, stage, days: Math.round(days) }),
      });
      if (res.ok) {
        setState("sent");
        return;
      }
      let msg = "";
      try {
        const data = await res.json();
        msg = data.error ?? "";
      } catch {
        msg = "no reply from the server";
      }
      setDetail(`${res.status} ${msg}`);
      setState("error");
    } catch {
      setDetail("network error");
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
        {state === "sending" ? "Sending…" : "Send this alert to my email (demo)"}
      </button>
      <span className="text-xs text-gray-400">Goes to {user.email}</span>
      {state === "sent" && <span className="text-xs text-emerald-300">Sent. Check spam too.</span>}
      {state === "error" && <span className="text-xs text-red-300">Could not send: {detail}</span>}
    </div>
  );
}