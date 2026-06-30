import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}

const variantClasses = {
  default: "bg-amber-100 text-amber-800 border border-amber-200",
  secondary: "bg-gray-100 text-gray-700 border border-gray-200",
  destructive: "bg-red-100 text-red-700 border border-red-200",
  outline: "border border-gray-300 text-gray-600 bg-white",
  success: "bg-green-100 text-green-700 border border-green-200",
  warning: "bg-orange-100 text-orange-700 border border-orange-200",
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variantClasses[variant], className)} {...props} />
  )
}
export { Badge }
