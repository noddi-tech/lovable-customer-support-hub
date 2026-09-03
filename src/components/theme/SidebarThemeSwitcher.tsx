import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import type React from "react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type ThemeChoice = "light" | "dark" | "system"

const OPTIONS: { value: ThemeChoice; icon: typeof Sun; labelKey: string; label: string }[] = [
  { value: "light", icon: Sun, labelKey: "theme.light", label: "Light" },
  { value: "dark", icon: Moon, labelKey: "theme.dark", label: "Dark" },
  { value: "system", icon: Monitor, labelKey: "theme.system", label: "System" },
]

interface SidebarThemeSwitcherProps {
  collapsed?: boolean
}

/**
 * Theme switcher for the sidebar footer. Persists via next-themes (localStorage,
 * key `support-hub-theme`) and defaults to the user's system preference.
 * Expanded: 3-icon segmented control. Collapsed: single button that cycles.
 */
export const SidebarThemeSwitcher: React.FC<SidebarThemeSwitcherProps> = ({
  collapsed = false,
}) => {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()

  // Avoid hydration/SSR-style mismatch: only reflect the active theme after mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const active = (mounted ? theme : "system") as ThemeChoice

  if (collapsed) {
    const current = OPTIONS.find((o) => o.value === active) ?? OPTIONS[2]
    const next = OPTIONS[(OPTIONS.indexOf(current) + 1) % OPTIONS.length]
    const Icon = current.icon
    return (
      <div className="flex justify-center px-0 py-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setTheme(next.value)}
              aria-label={t("theme.toggle", "Toggle theme")}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              <Icon className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {t(current.labelKey, current.label)} → {t(next.labelKey, next.label)}
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="px-3 py-1">
      <div className="flex items-center gap-1 rounded-md border border-sidebar-border p-0.5">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon
          const selected = active === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              aria-label={t(opt.labelKey, opt.label)}
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t(opt.labelKey, opt.label)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
