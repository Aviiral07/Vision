import React from "react"
import { AlertCircle, AlertTriangle, CheckCircle, ShieldAlert, Sparkles, Trash2, Wrench } from "lucide-react"

export function RiskAssessmentCard({ result }) {
  if (!result) {
    return (
      <div className="rounded-xl bg-white border border-zinc-200 p-6 flex flex-col items-center justify-center text-center h-full min-h-[260px] shadow-sm">
        <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-800 mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-zinc-800 mb-1">Awaiting Inspection</h4>
        <p className="text-xs text-zinc-500 font-medium max-w-xs">
          Select or capture a facility photo to run the Groq multimodal AI inspection pipeline.
        </p>
      </div>
    )
  }

  const {
    hostel_id = "Hostel-A",
    damage_type = "Healthy Facility",
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
      <div className="rounded-xl bg-blue-50/80 border-2 border-blue-300 p-6 flex flex-col justify-between h-full min-h-[260px] shadow-sm space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-lg font-black text-blue-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-700" />
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

        <div className="p-4 rounded-xl bg-white border border-blue-200 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">Local Status</span>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-blue-900 text-white tracking-wider">
              PENDING SYNC
            </span>
          </div>
          <div className="pt-2 border-t border-blue-100">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Field Storage Protocol
            </span>
            <p className="text-xs font-semibold text-zinc-800 leading-snug">
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
      <div className="rounded-xl bg-red-50 border-2 border-red-300 p-6 flex flex-col justify-between h-full min-h-[260px] shadow-sm space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-lg font-black text-red-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 animate-bounce" />
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

        <div className="p-4 rounded-xl bg-white border border-red-200 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">Status</span>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-red-600 text-white tracking-wider">
              FAILED
            </span>
          </div>
          <div className="pt-2 border-t border-red-100">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Error Details
            </span>
            <p className="text-sm font-bold text-red-800 leading-snug">
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

  const score = Number(damage_score ?? risk_score) || 0
  const isCritical = severity === "CRITICAL" || score > 75
  const isMedium = severity === "MEDIUM" || (score > 40 && score <= 75)
  const isGarbageDetected = hygiene_status === "Garbage Detected"
  const isDirty = hygiene_status === "Dirty"

  return (
    <div className="rounded-xl bg-white border border-zinc-200 p-6 space-y-5 h-full flex flex-col justify-between shadow-sm">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            AI Assessment
            {isCritical && <AlertCircle className="w-5 h-5 text-red-600" />}
            {!isCritical && isGarbageDetected && <Trash2 className="w-5 h-5 text-orange-500" />}
            {!isCritical && !isGarbageDetected && isMedium && <AlertTriangle className="w-5 h-5 text-amber-500" />}
            {!isCritical && !isGarbageDetected && !isMedium && <CheckCircle className="w-5 h-5 text-emerald-500" />}
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
            {hostel_id}
          </span>
        </div>
        <p className="text-xs text-zinc-500 font-medium">
          Groq Vision Infrastructure Analysis (MoSJE Protocol)
        </p>
      </div>

      <div className="space-y-3.5">
        {/* Severity & Score Panel */}
        <div className={`p-4 rounded-xl border ${
          isCritical ? "bg-red-50 border-red-200 text-red-950" :
          isGarbageDetected ? "bg-orange-50 border-orange-200 text-orange-950" :
          isMedium ? "bg-amber-50 border-amber-200 text-amber-950" :
          "bg-emerald-50 border-emerald-200 text-emerald-950"
        } space-y-3`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">Severity Level</span>
            <span className={`px-2.5 py-1 rounded-md text-xs font-black tracking-wide ${
              isCritical ? "bg-red-600 text-white shadow-sm" :
              isMedium ? "bg-amber-500 text-white shadow-sm" :
              "bg-emerald-600 text-white shadow-sm"
            }`}>
              {severity}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-700">Damage Risk Index</span>
            <span
              className={`text-xl font-black ${
                isCritical ? "text-red-700" :
                isMedium ? "text-amber-700" :
                "text-emerald-700"
              }`}
            >
              {score}%
            </span>
          </div>

          <div className="w-full bg-zinc-200/80 rounded-full h-2.5 overflow-hidden shadow-inner">
            <div
              className={`h-full transition-all duration-500 ${
                isCritical ? "bg-red-600" :
                isMedium ? "bg-amber-500" :
                "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
            />
          </div>
        </div>

        {/* Hygiene & Asset Status Badges */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Hygiene Status
            </span>
            <span className={`text-xs font-extrabold ${
              isGarbageDetected ? "text-orange-700" :
              isDirty ? "text-amber-700" :
              "text-emerald-700"
            }`}>
              {hygiene_status}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5" /> Broken Assets
            </span>
            <span className={`text-xs font-extrabold ${
              broken_assets ? "text-red-700" : "text-emerald-700"
            }`}>
              {broken_assets ? "Detected" : "None Detected"}
            </span>
          </div>
        </div>

        {/* Action Recommendation */}
        <div className={`p-4 rounded-xl border ${
          isCritical ? "border-red-300 bg-red-100/60" : "border-zinc-200 bg-zinc-50"
        }`}>
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldAlert className={`w-4 h-4 ${isCritical ? "text-red-700" : "text-blue-900"}`} />
            <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
              Required Protocol
            </span>
          </div>
          <p className={`text-sm font-bold leading-snug ${isCritical ? "text-red-800" : "text-zinc-800"}`}>
            {recommendation}
          </p>
        </div>
      </div>
    </div>
  )
}
