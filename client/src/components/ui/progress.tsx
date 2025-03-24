import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { rainbow?: boolean }
>(({ className, value, rainbow = false, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 transition-all",
        rainbow ? "bg-gradient-rainbow animate-gradient" : "bg-primary"
      )}
      style={{ 
        transform: `translateX(-${100 - (value || 0)}%)`,
        ...rainbow && {
          backgroundImage: "linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8f00ff)",
          backgroundSize: "200% 100%",
          animation: "gradient 3s linear infinite"
        }
      }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
