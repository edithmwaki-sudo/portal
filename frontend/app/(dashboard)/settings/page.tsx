"use client"

import { Laptop, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { PageToolbar } from "@/components/dashboard/page-toolbar"
import { cn } from "@/lib/utils"

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <>
      <PageToolbar
        title="Settings"
        description="Manage your portal preferences."
      />
      <div className="mx-4 mb-4 sm:mx-6 sm:mb-6 lg:mx-[50px] lg:mb-[30px] flex flex-col gap-4">
        <section className="rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          <h2 className="mb-1 text-xl font-semibold tracking-tight">
            Appearance
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Choose how the portal looks. “System” follows your device’s
            light/dark setting.
          </p>
          <div
            role="radiogroup"
            aria-label="Color theme"
            className="inline-flex rounded-lg border bg-muted p-1"
          >
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
              const active = theme === value
              return (
                <button
                  key={value}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-lg bg-card p-6 shadow-lg shadow-black/5">
          <h2 className="mb-1 text-xl font-semibold tracking-tight">
            Palette
          </h2>
          <p className="text-sm text-muted-foreground">
            The portal palette is themed from the{" "}
            <code className="font-mono text-xs font-medium text-foreground">
              --brand
            </code>{" "}
            and{" "}
            <code className="font-mono text-xs font-medium text-foreground">
              --sidebar
            </code>{" "}
            CSS variables in{" "}
            <code className="font-mono text-xs font-medium text-foreground">
              app/globals.css
            </code>
            .
          </p>
        </section>
      </div>
    </>
  )
}