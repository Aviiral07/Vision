import React from "react"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

export function PipelineProgress({ timeline = [], isProcessing }) {
  if (!isProcessing && timeline.length === 0) return null

  // Find currently active step
  const activeStep = timeline.find((s) => s.status === "processing")
  const failedStep = timeline.find((s) => s.status === "failed")

  if (!isProcessing && !failedStep) return null

  return (
    <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3.5 flex items-center justify-between">
      <div className="flex items-center gap-2.5 text-xs text-zinc-300">
        {failedStep ? (
          <>
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <span className="text-red-300 font-medium">
              Inspection failed: {failedStep.label}
            </span>
          </>
        ) : isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-zinc-300 shrink-0" />
            <span>
              {activeStep ? activeStep.label : "Running computer vision models..."}
            </span>
          </>
        ) : null}
      </div>

      {isProcessing && (
        <span className="text-[11px] text-zinc-500">
          In progress
        </span>
      )}
    </div>
  )
}
