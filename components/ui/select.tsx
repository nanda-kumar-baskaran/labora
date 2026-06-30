import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          "[&>option]:bg-white [&>option]:text-gray-900",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-3 h-4 w-4 text-gray-400" />
    </div>
  )
)
Select.displayName = "Select"
export { Select }
