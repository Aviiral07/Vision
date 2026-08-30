import React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-blue-900 text-white shadow hover:bg-blue-800 active:bg-blue-950 font-semibold",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
        outline:
          "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900",
        secondary:
          "bg-zinc-100 text-zinc-900 border border-zinc-300 hover:bg-zinc-200",
        ghost:
          "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
        link:
          "text-blue-700 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
