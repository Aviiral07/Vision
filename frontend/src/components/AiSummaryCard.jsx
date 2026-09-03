import React from "react"
import { Cpu, CheckCircle2, AlertTriangle, AlertCircle, Trash2, Wrench, ShieldAlert, Sparkles } from "lucide-react"

export function AiSummaryCard({ result }) {
  if (!result) return null

  const {
    hygiene_status = "Clean",
    damage_score = 0,
    risk_score = 0,
    severity = "LOW",
    broken_assets = false,
    recommendation = "Monitor Asset",
    hostel_id = "Hostel-A",
  } = result

  const score = Math.round(Number(damage_score ?? risk_score) || 0)
  const isCritical = severity === "CRITICAL" || score > 75
  const isMedium = severity === "MEDIUM" || (score > 35 && score <= 75)

  const isGarbage = (hygiene_status || "").toLowerCase().includes("garbage")
  const isDirty = (hygiene_status || "").toLowerCase() === "dirty"

  return (
    <div className="rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-zinc-50/50 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header with Transparency Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200/80">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-blue-900 text-white flex items-center justify-center shadow-sm">
            <Cpu className="w-5 h-5 text-blue-200" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-zinc-900">Groq AI Multimodal Summary</h4>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                qwen/qwen3.6-27b VLM
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 font-medium">
              Categorization derived via MoSJE multimodal prompt heuristics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>LLM Categorization Active</span>
        </div>
      </div>

      {/* Honesty & Architecture Callout */}
      <div className="px-3.5 py-2.5 rounded-lg bg-zinc-100/80 border border-zinc-200 text-xs text-zinc-700 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-zinc-900">Direct Multimodal Inference:</span> Condition evaluated via Groq Vision Language Model classification (no synthetic bounding boxes).
        </div>
      </div>

      {/* Grid of Key Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Hygiene Categorization */}
        <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors shadow-xs ${
          isGarbage
            ? "bg-rose-50/90 border-rose-200 text-rose-950"
            : isDirty
            ? "bg-amber-50/90 border-amber-200 text-amber-950"
            : "bg-emerald-50/90 border-emerald-200 text-emerald-950"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Hygiene
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider ${
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
        <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors shadow-xs ${
          isCritical
            ? "bg-red-50/90 border-red-200 text-red-950"
            : isMedium
            ? "bg-amber-50/90 border-amber-200 text-amber-950"
            : "bg-emerald-50/90 border-emerald-200 text-emerald-950"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Risk Level
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider ${
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
            <div className="flex items-baseline justify-between mb-1.5">
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
        <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors shadow-xs ${
          broken_assets
            ? "bg-orange-50/90 border-orange-200 text-orange-950"
            : "bg-emerald-50/90 border-emerald-200 text-emerald-950"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" /> Broken Assets
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider ${
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

      {/* Recommended Action Footer */}
      <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 shrink-0 ${isCritical ? "text-red-700" : "text-blue-900"}`} />
          <span className="text-zinc-700 font-medium">
            MoSJE Action Protocol: <strong className="text-blue-950 font-bold">{recommendation}</strong>
          </span>
        </div>
        <span className="text-[11px] font-semibold text-blue-800 self-start sm:self-auto">
          Facility Tag: {hostel_id}
        </span>
      </div>
    </div>
  )
}
