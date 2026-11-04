

import React from "react";


interface WaterSeverityScoreProps {
  score: number;
}

export default function WaterSeverityScore({
  score,
}: WaterSeverityScoreProps) {
  const safeScore = Math.max(0, Math.min(100, score));

  const severity =
    safeScore <= 30
      ? {
          label: "Healthy",
          color: "#22c55e",
          background: "rgba(34,197,94,0.12)",
        }
      : safeScore <= 60
      ? {
          label: "Medium",
          color: "#eab308",
          background: "rgba(234,179,8,0.12)",
        }
      : {
          label: "Danger",
          color: "#ef4444",
          background: "rgba(239,68,68,0.12)",
        };

  const angle = (safeScore / 100) * 180;

  return (
    <div className="severity-card">
      <h3>Water Severity Score</h3>

      <div className="severity-gauge">
        <div
          className="severity-arc"
          style={{
            background: `conic-gradient(
              from 270deg,
              ${severity.color} 0deg ${angle}deg,
              #243e61 ${angle}deg 180deg,
              transparent 180deg 360deg
            )`,
          }}
        />

        <div className="severity-inner">
          <span style={{ color: severity.color }}>
            {Math.round(safeScore)}
          </span>
        </div>
      </div>

      <div
        className="severity-status"
        style={{
          color: severity.color,
          background: severity.background,
          borderColor: severity.color,
        }}
      >
        {severity.label}
      </div>

      <p className="severity-description">
        Composite score based on inlet water quality parameters.
      </p>

      <p className="severity-range">
        Healthy: 0–30 | Medium: 31–60 | Danger: 61–100
      </p>
    </div>
  );
}
