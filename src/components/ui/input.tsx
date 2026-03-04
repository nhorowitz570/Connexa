import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-[#333] bg-[#1A1A1A] px-4 py-3 text-base text-white shadow-xs transition-[color,box-shadow,border-color] outline-none selection:bg-indigo-500 selection:text-white file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[#666] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus:border-indigo-500/50",
        "aria-invalid:border-red-500 aria-invalid:ring-red-500/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
