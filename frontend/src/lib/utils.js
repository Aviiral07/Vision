import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDateTime(isoString) {
  if (!isoString) return "N/A"
  try {
    const d = new Date(isoString)
    return d.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  } catch {
    return isoString
  }
}

export function getSeverityInfo(riskScore = 0) {
  const score = Number(riskScore) || 0
  if (score > 75) {
    return {
      label: "Immediate Repair Required",
      level: "Critical",
      textColor: "text-red-400",
      bgColor: "bg-red-950/40",
      borderColor: "border-red-800/60",
      badgeClass: "bg-red-950 text-red-400 border-red-800",
      dotColor: "bg-red-500",
      barColor: "bg-red-600",
    }
  }
  if (score > 40) {
    return {
      label: "Schedule Maintenance",
      level: "Moderate",
      textColor: "text-amber-400",
      bgColor: "bg-amber-950/40",
      borderColor: "border-amber-800/60",
      badgeClass: "bg-amber-950 text-amber-400 border-amber-800",
      dotColor: "bg-amber-500",
      barColor: "bg-amber-600",
    }
  }
  return {
    label: "Monitor Asset",
    level: "Healthy",
    textColor: "text-emerald-400",
    bgColor: "bg-emerald-950/40",
    borderColor: "border-emerald-800/60",
    badgeClass: "bg-emerald-950 text-emerald-400 border-emerald-800",
    dotColor: "bg-emerald-500",
    barColor: "bg-emerald-600",
  }
}

export function formatConfidence(conf) {
  if (conf === null || conf === undefined) return "0%"
  const val = Number(conf) <= 1 ? Number(conf) * 100 : Number(conf)
  return `${Math.round(val)}%`
}
