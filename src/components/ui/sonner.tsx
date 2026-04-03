"use client"

import type { CSSProperties } from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      position="top-center"
      theme={theme as ToasterProps["theme"]}
      richColors
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-lg group-[.toaster]:shadow-lg group-[.toaster]:font-sans",
          title: "text-sm font-semibold",
          description: "text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md group-[.toast]:border-0",
          cancelButton:
            "group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground group-[.toast]:rounded-md group-[.toast]:border group-[.toast]:border-border",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:text-muted-foreground group-[.toast]:border group-[.toast]:border-border",
        },
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
