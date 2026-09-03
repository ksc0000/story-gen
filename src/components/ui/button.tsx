"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { ClickBurst, type Burst } from "@/components/click-burst"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[var(--ring-soft)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-[var(--destructive-ring)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-purple-400 to-violet-400 text-white shadow-[0_4px_0_rgb(139,92,246),0_8px_16px_rgba(167,139,250,0.4)] hover:from-purple-500 hover:to-violet-500 hover:shadow-[0_4px_0_rgb(124,58,237),0_10px_20px_rgba(167,139,250,0.5)] active:translate-y-[2px] active:shadow-[0_2px_0_rgb(109,40,217),0_4px_8px_rgba(167,139,250,0.3)]",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground ",
        secondary:
          "bg-secondary text-secondary-foreground hover:brightness-95 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground ",
        destructive:
          "bg-[var(--destructive-soft)] text-destructive border-[var(--destructive-ring)] hover:bg-[var(--destructive-soft-strong)] focus-visible:border-destructive focus-visible:ring-[var(--destructive-ring)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-11 min-h-[44px] gap-2 px-4 text-sm font-medium has-[[data-icon=inline-end]]:pr-3 has-[[data-icon=inline-start]]:pl-3",
        xs: "h-8 min-h-[44px] gap-1 rounded-full px-2.5 text-xs has-[[data-icon=inline-end]]:pr-2 has-[[data-icon=inline-start]]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 min-h-[44px] gap-1.5 rounded-full px-3 text-xs has-[[data-icon=inline-end]]:pr-2 has-[[data-icon=inline-start]]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 min-h-[48px] gap-2 px-6 text-base has-[[data-icon=inline-end]]:pr-4 has-[[data-icon=inline-start]]:pl-4",
        icon: "size-11 min-h-[44px] min-w-[44px]",
        "icon-xs":
          "size-8 min-h-[44px] min-w-[44px] rounded-full [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm":
          "size-9 min-h-[44px] min-w-[44px] rounded-full",
        "icon-lg": "size-12 min-h-[48px] min-w-[48px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const [bursts, setBursts] = React.useState<Burst[]>([])

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (variant === "default") {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const newBurst = { id: Date.now(), x, y }

      setBursts((prev) => [...prev, newBurst])
      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== newBurst.id))
      }, 1000)
    }
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      onPointerDown={handlePointerDown}
      {...props}
    >
      {props.children}
      {variant === "default" && <ClickBurst bursts={bursts} />}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
