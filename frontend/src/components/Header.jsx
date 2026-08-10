import React from "react"
import logoImg from "@/assets/logo.png"

export function Header({ serverOnline }) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-3.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="Vision Logo"
            className="h-8 w-8 rounded-md object-contain bg-zinc-900 border border-zinc-800 p-0.5"
          />
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-zinc-100 text-sm tracking-tight">
              Vision
            </span>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">
              Infrastructure Inspection
            </span>
          </div>
        </div>

        {/* Server Connection Status */}
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              serverOnline ? "bg-emerald-500" : "bg-zinc-600"
            }`}
          />
          <span className="text-xs text-zinc-400 font-medium">
            {serverOnline ? "Connected" : "Offline"}
          </span>
        </div>
      </div>
    </header>
  )
}
