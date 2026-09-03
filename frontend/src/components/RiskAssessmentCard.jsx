import React from "react"
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Trash2,
  Wrench,
  ShieldAlert,
  Sparkles,
} from "lucide-react"

export function RiskAssessmentCard({ result }) {
  if (!result) {
    return (
      <div className="rounded-xl bg-white border border-zinc-200 p-6 flex flex-col items-center justify-center text-center h-full min-h-[320px] shadow-sm">
        <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-800 mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-zinc-800 mb-1">Awaiting Inspection</h4>
        <p className="text-xs text-zinc-500 font-medium max-w-xs">
          Capture or upload a facility photo to run the Groq multimodal AI inspection pipeline.
        </p>
      </div>
    )
  }

  const {
    hostel_id = "Hostel-A",
    damage_score = 0,
    risk_score = 0,
    hygiene_status = "Clean",
    broken_assets = false,
    severity = "LOW",
    recommendation = "Monitor Asset",
    status,
  } = result

  const isQueuedOffline = status === "queued_offline" || severity === "SAVED OFFLINE"
  const isFailed =
    status === "failed" ||
    hygiene_status === "Error" ||
    (recommendation && recommendation.toLowerCase().includes("failed"))

  if (isQueuedOffline) {
    return (
      <div className="rounded-xl bg-blue-50/80 border-2 border-blue-300 p-5 flex flex-col justify-between h-full min-h-[320px] shadow-sm space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-base font-black text-blue-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-700" />
              Saved to Offline Queue
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
              {hostel_id}
            </span>
          </div>
          <p className="text-xs text-blue-700 font-medium">
            Stored Safely on Device (IndexedDB Storage)
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-blue-200 space-y-2 shadow-sm text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-zinc-600">Local Status</span>
            <span className="px-2 py-0.5 rounded-md font-black bg-blue-900 text-white tracking-wider">
              PENDING SYNC
            </span>
          </div>
          <div className="pt-2 border-t border-blue-100">
            <span className="font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Field Storage Protocol
            </span>
            <p className="font-semibold text-zinc-800 leading-snug">
              {recommendation || "High-resolution photo and GPS coordinates are preserved locally. InfraMind AI will analyze upon reconnection."}
            </p>
          </div>
        </div>

        <div className="p-3 bg-blue-100/60 rounded-lg text-xs text-blue-900 font-medium">
          📡 You can continue capturing facility inspections offline. All audits will sync automatically once internet connectivity is restored.
        </div>
      </div>
    )
  }

  if (isFailed) {
    return (
      <div className="rounded-xl bg-red-50 border-2 border-red-300 p-5 flex flex-col justify-between h-full min-h-[320px] shadow-sm space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-base font-black text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 animate-bounce" />
              AI Analysis Failed
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
              {hostel_id}
            </span>
          </div>
          <p className="text-xs text-red-600 font-medium">
            AI Vision Inference Error (Analysis Halted)
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-red-200 space-y-2 shadow-sm text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold uppercase tracking-wider text-zinc-600">Status</span>
            <span className="px-2 py-0.5 rounded-md font-black bg-red-600 text-white tracking-wider">
              FAILED
            </span>
          </div>
          <div className="pt-2 border-t border-red-100">
            <span className="font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Error Details
            </span>
            <p className="font-bold text-red-800 leading-snug">
              {recommendation || "The AI vision model encountered an error analyzing this image."}
            </p>
          </div>
        </div>

        <div className="p-3 bg-red-100/60 rounded-lg text-xs text-red-700 font-medium">
          💡 Please check your image clarity or server Groq API configuration and click <strong>Retake / Change Photo</strong> to retry.
        </div>
      </div>
    )
  }

  const score = Math.round(Number(damage_score ?? risk_score) || 0)
  const isCritical = severity === "CRITICAL" || score > 75
  const isMedium = severity === "MEDIUM" || (score > 35 && score <= 75)

  const isGarbage = (hygiene_status || "").toLowerCase().includes("garbage")
  const isDirty = (hygiene_status || "").toLowerCase() === "dirty"

  return (
    <div className="rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-zinc-50/50 p-5 shadow-sm space-y-4 flex flex-col justify-between h-full">
      <div className="space-y-3.5">
        {/* Header with Model & Status Tag */}
        <div className="flex flex-col gap-2 pb-3 border-b border-zinc-200/80">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-blue-900 text-white flex items-center justify-center shadow-sm shrink-0">
                <Cpu className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900">Groq AI Multimodal Summary</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                    qwen/qwen3.6-27b VLM
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>LLM Categorization Active</span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-600 font-medium">
            Categorization derived via MoSJE multimodal prompt heuristics
          </p>
        </div>

        {/* Honesty & Architecture Callout */}
        <div className="px-3.5 py-2.5 rounded-lg bg-zinc-100/90 border border-zinc-200 text-xs text-zinc-700 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-zinc-900">Direct Multimodal Inference:</span> Condition evaluated via Groq Vision Language Model classification (no synthetic bounding boxes).
          </div>
        </div>

        {/* 3 Categories Stacked Cleanly in the Sidebar */}
        <div className="space-y-3">
          {/* 1. Hygiene Categorization */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors shadow-2xs ${
            isGarbage
              ? "bg-rose-50/90 border-rose-200 text-rose-950"
              : isDirty
              ? "bg-amber-50/90 border-amber-200 text-amber-950"
              : "bg-emerald-50/90 border-emerald-200 text-emerald-950"
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> HYGIENE
              </span>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md tracking-wider ${
                isGarbage
                  ? "bg-rose-600 text-white"
                  : isDirty
                  ? "bg-amber-600 text-white"
                  : "bg-emerald-600 text-white"
              }`}>
                {hygiene_status}
              </span>
            </div>
            <div>
              <div className="text-base font-black mb-0.5">
                {hygiene_status}
              </div>
              <p className="text-[11px] font-medium leading-snug text-zinc-600">
                {isGarbage
                  ? "Garbage or waste accumulation identified in visual inspection."
                  : isDirty
                  ? "Visible grime, stains, or surface dirt requiring sanitation."
                  : "Sanitary conditions meet acceptable facility standards."}
              </p>
            </div>
          </div>

          {/* 2. Structural & Damage Risk */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors shadow-2xs ${
            isCritical
              ? "bg-red-50/90 border-red-200 text-red-950"
              : isMedium
              ? "bg-amber-50/90 border-amber-200 text-amber-950"
              : "bg-emerald-50/90 border-emerald-200 text-emerald-950"
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> RISK LEVEL
              </span>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md tracking-wider ${
                isCritical
                  ? "bg-red-600 text-white"
                  : isMedium
                  ? "bg-amber-600 text-white"
                  : "bg-emerald-600 text-white"
              }`}>
                {severity}
              </span>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-base font-black">
                  {score}% Damage Index
                </span>
                <span className="text-[11px] font-bold text-zinc-500">
                  {isCritical ? "Critical" : isMedium ? "Medium" : "Low Risk"}
                </span>
              </div>
              <div className="w-full bg-zinc-200/80 rounded-full h-2 overflow-hidden mb-1">
                <div
                  className={`h-full transition-all duration-500 ${
                    isCritical ? "bg-red-600" : isMedium ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(6, score))}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3. Asset Integrity */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors shadow-2xs ${
            broken_assets
              ? "bg-orange-50/90 border-orange-200 text-orange-950"
              : "bg-emerald-50/90 border-emerald-200 text-emerald-950"
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" /> BROKEN ASSETS
              </span>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md tracking-wider ${
                broken_assets
                  ? "bg-orange-600 text-white"
                  : "bg-emerald-600 text-white"
              }`}>
                {broken_assets ? "DETECTED" : "NONE"}
              </span>
            </div>
            <div>
              <div className="text-base font-black mb-0.5">
                {broken_assets ? "Damage Identified" : "Assets Intact"}
              </div>
              <p className="text-[11px] font-medium leading-snug text-zinc-600">
                {broken_assets
                  ? "Physical infrastructure, wall, or fixture damage visible."
                  : "No structural breakage observed in asset frame."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Action Footer */}
      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs mt-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 shrink-0 ${isCritical ? "text-red-700" : "text-blue-900"}`} />
          <span className="text-zinc-700 font-medium">
            MoSJE Protocol: <strong className="text-blue-950 font-bold">{recommendation}</strong>
          </span>
        </div>
        <span className="text-[11px] font-semibold text-blue-800 shrink-0">
          Tag: {hostel_id}
        </span>
      </div>
    </div>
  )
}
