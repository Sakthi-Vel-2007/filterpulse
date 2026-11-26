import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLive, useMode } from "../data/live";

type Tone = "red" | "amber" | "grey";
const TONE: Record<Tone, string> = {
  red: "border-red-500/40 bg-red-500/10 text-red-200",
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  grey: "border-gray-500/40 bg-gray-500/10 text-gray-200",
};

export default function LiveNotice() {
  const mode = useMode();
  const live = useLive();
  if (mode !== "live") return null;

  const notices: { tone: Tone; node: ReactNode }[] = [];
  const link = "underline text-cyan-300";

  if (live.status === "signed-out") {
    notices.push({
      tone: "grey",
      node: (
        <>
          Sign in on <Link to="/purifier" className={link}>My Purifier</Link> to see live data. Nothing is shown as
          live until a real purifier reports.
        </>
      ),
    });
  } else if (live.status === "no-device") {
    notices.push({
      tone: "grey",
      node: (
        <>
          No purifier is linked to this account. Link one on <Link to="/purifier" className={link}>My Purifier</Link>.
        </>
      ),
    });
  } else if (live.status === "waiting") {
    notices.push({ tone: "grey", node: <>Waiting for the first reading from the purifier…</> });
  } else if (live.status === "error") {
    notices.push({ tone: "red", node: <>Could not load live data: {live.message}</> });
  } else if (live.status === "offline") {
    notices.push({
      tone: "red",
      node: <>Device offline. The values below are the last readings received. They are not current.</>,
    });
  }

  if (live.status === "live" || live.status === "offline") {
    if (live.stall) {
      notices.push({
        tone: "red",
        node: <>The pump was stopped by overcurrent protection. Check for a blocked line.</>,
      });
    } else if (!live.pumpOn) {
      notices.push({
        tone: "amber",
        node: <>The pump is off. Pump load and flow readings are not meaningful while it is stopped.</>,
      });
    }
    if (!live.estimate) {
      notices.push({
        tone: "amber",
        node: <>Filter-life estimates start once the pump has been running and reporting.</>,
      });
    }
    if (!live.baselineAt) {
      notices.push({
        tone: "amber",
        node: (
          <>
            Using placeholder clean-filter values, so load and fouling numbers are not meaningful yet. Record a
            clean-filter baseline on the <Link to="/livecheck" className={link}>Live data check</Link> page.
          </>
        ),
      });
    }
  }

  if (notices.length === 0) return null;
  return (
    <div className="mb-4 space-y-2">
      {notices.map((n, i) => (
        <div key={i} className={`rounded-xl border px-4 py-2 text-xs ${TONE[n.tone]}`}>
          {n.node}
        </div>
      ))}
    </div>
  );
}