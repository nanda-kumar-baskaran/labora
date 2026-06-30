import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "link" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  loading?: boolean
}

const variantClasses = {
  default: "bg-red-600 text-white hover:bg-red-700 shadow-sm border border-red-700",
  destructive: "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200",
  outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400",
  ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
  link: "text-red-600 underline-offset-4 hover:underline hover:text-red-700 p-0 h-auto",
  secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200",
}
const sizeClasses = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-11 px-8 text-base",
  icon: "h-10 w-10",
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  )
)
Button.displayName = "Button"
export { Button }
