import React from "react"
import { cn } from "@/lib/utils"

export function TabsList({ className, children }) {
  return (
    <div
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg bg-zinc-900/80 p-1 text-zinc-400 border border-zinc-800",
        className
      )}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ active, onClick, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        active
          ? "bg-zinc-800 text-zinc-50 shadow-sm border border-zinc-700/60"
          : "hover:text-zinc-200 text-zinc-400",
        className
      )}
    >
      {children}
    </button>
  )
}
