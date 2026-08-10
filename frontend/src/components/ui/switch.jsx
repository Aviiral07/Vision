import React from "react"
import { cn } from "@/lib/utils"

export function Switch({ checked, onCheckedChange, label, className, color = "bg-zinc-100" }) {
  return (
    <label className={cn("inline-flex items-center gap-2.5 cursor-pointer select-none text-xs font-medium text-zinc-300", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400",
          checked ? "bg-zinc-700" : "bg-zinc-900"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-3.5 w-3.5 rounded-full transition-transform",
            checked ? `translate-x-4.5 ${color}` : "translate-x-0.5 bg-zinc-400"
          )}
        />
      </button>
      {label && <span>{label}</span>}
    </label>
  )
}
