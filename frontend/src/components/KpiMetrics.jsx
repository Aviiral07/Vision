import React from "react"
import { AlertCircle, Wrench, CheckCircle2, FileImage } from "lucide-react"

export function KpiMetrics({ stats, loading }) {
  const {
    total_inspections = 0,
    average_risk_score = 0,
    critical_count = 0,
    maintenance_count = 0,
  } = stats || {}

  const metrics = [
    {
      title: "Total Inspections",
      value: loading ? "—" : total_inspections.toString(),
      description: "Audited structure images",
      icon: FileImage,
      iconColor: "text-zinc-400",
    },
    {
      title: "Average Risk Score",
      value: loading ? "—" : `${average_risk_score}%`,
      description: "Across inspected assets",
      icon: AlertCircle,
      iconColor: average_risk_score > 50 ? "text-amber-400" : "text-zinc-400",
    },
    {
      title: "Immediate Attention",
      value: loading ? "—" : critical_count.toString(),
      description: "Risk score above 75%",
      icon: AlertCircle,
      iconColor: critical_count > 0 ? "text-red-400" : "text-zinc-400",
      alert: critical_count > 0,
    },
    {
      title: "Scheduled Maintenance",
      value: loading ? "—" : maintenance_count.toString(),
      description: "Risk score 40% – 75%",
      icon: Wrench,
      iconColor: maintenance_count > 0 ? "text-amber-400" : "text-zinc-400",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m, idx) => {
        const Icon = m.icon
        return (
          <div
            key={idx}
            className={`rounded-xl bg-zinc-900/60 p-4 border transition-colors ${
              m.alert
                ? "border-red-900/50 bg-red-950/10"
                : "border-zinc-800/70 hover:border-zinc-700/70"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                {m.title}
              </span>
              <Icon className={`h-4 w-4 ${m.iconColor}`} />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-semibold tracking-tight text-zinc-100">
                {m.value}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {m.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
