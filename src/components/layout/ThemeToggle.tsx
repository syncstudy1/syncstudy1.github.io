import * as React from "react"
import { useTheme } from "@/hooks/useTheme"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"
  const [showTooltip, setShowTooltip] = React.useState(false)

  const tooltipText = isDark ? "Switch to light mode" : "Switch to dark mode"

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={toggleTheme}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={tooltipText}
        title={tooltipText}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95"
      >
        {/* Sun Icon for Dark Mode (click to switch to light) */}
        <Sun
          className={`h-4 w-4 transition-all duration-300 ${
            isDark
              ? "rotate-0 scale-100 opacity-100 text-amber-400"
              : "-rotate-90 scale-0 opacity-0 absolute"
          }`}
          aria-hidden="true"
        />
        {/* Moon Icon for Light Mode (click to switch to dark) */}
        <Moon
          className={`h-4 w-4 transition-all duration-300 ${
            !isDark
              ? "rotate-0 scale-100 opacity-100 text-slate-700"
              : "rotate-90 scale-0 opacity-0 absolute"
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Accessible Hover / Focus Tooltip */}
      {showTooltip && (
        <div
          role="tooltip"
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-md border border-border/80 animate-in fade-in-0 zoom-in-95 pointer-events-none"
        >
          {tooltipText}
        </div>
      )}
    </div>
  )
}
