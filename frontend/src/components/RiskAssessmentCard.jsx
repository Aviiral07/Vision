import React from "react"
import { AlertCircle } from "lucide-react"

export function RiskAssessmentCard({ result }) {
  if (!result) {
    return (
      <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6 flex flex-col items-center justify-center text-center h-full min-h-[220px]">
        <p className="text-xs text-zinc-500">
          Inspection results will appear here after analysis.
        </p>
      </div>
    )
  }

  const {
    damage_type = "Healthy",
    confidence = 0,
    risk_score = 0,
    recommendation = "No action required",
  } = result

  const isHighRisk = risk_score > 75
  const isModerateRisk = risk_score > 40 && risk_score <= 75

  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-5 space-y-4 h-full flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">
          Inspection Result
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          Summary of detected defects
        </p>
      </div>

      <div className="space-y-3">
        {/* Defect Type & Risk */}
        <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Detected Damage</span>
            <span className="text-xs font-semibold text-zinc-100">
              {damage_type}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Risk Score</span>
            <span
              className={`text-sm font-bold ${
                isHighRisk
                  ? "text-red-400"
                  : isModerateRisk
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {risk_score}%
            </span>
          </div>

          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full ${
                isHighRisk
                  ? "bg-red-500"
                  : isModerateRisk
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(5, risk_score))}%` }}
            />
          </div>
        </div>

        {/* Action Recommendation */}
        <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">
            Recommendation
          </span>
          <p className="text-xs text-zinc-200 font-medium">
            {recommendation}
          </p>
        </div>
      </div>
    </div>
  )
}
