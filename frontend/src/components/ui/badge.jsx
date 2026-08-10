import React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400 gap-1.5",
  {
    variants: {
      variant: {
        default:
          "border-zinc-700 bg-zinc-800 text-zinc-100",
        secondary:
          "border-zinc-800 bg-zinc-900 text-zinc-300",
        destructive:
          "border-red-900/60 bg-red-950/80 text-red-300",
        warning:
          "border-amber-900/60 bg-amber-950/80 text-amber-300",
        success:
          "border-emerald-900/60 bg-emerald-950/80 text-emerald-300",
        outline:
          "text-zinc-300 border-zinc-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
