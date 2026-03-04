import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-xl border border-[#333] bg-[#1A1A1A] px-4 py-3 text-base text-white shadow-xs transition-[color,box-shadow,border-color] outline-none placeholder:text-[#666] focus:border-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-red-500/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
