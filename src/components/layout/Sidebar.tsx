import * as React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"
import { useSubscriptionStore } from "@/stores/subscriptionStore"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import {
  LayoutDashboard,
  Timer,
  CalendarDays,
  FileQuestion,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Crown,
  Sparkles,
} from "lucide-react"

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

const NAV_ITEMS = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Study Room", path: "/study", icon: Timer },
  { name: "Planner", path: "/planner", icon: CalendarDays },
  { name: "Practice Quiz", path: "/quiz", icon: FileQuestion },
  { name: "Analytics", path: "/analytics", icon: BarChart3 },
  { name: "Premium", path: "/premium", icon: Crown },
]

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuthStore()
  const { isPremium } = useSubscriptionStore()

  const handleSignOut = async () => {
    await signOut()
    navigate("/login", { replace: true })
  }

  if (!user) return null

  const premiumActive = isPremium()

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 hidden lg:flex flex-col transition-all duration-300 ease-in-out border-r border-[#26242E] ${
        collapsed ? "w-[76px]" : "w-[240px]"
      } bg-[#19171F] text-[#ECE7F2]`}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 h-20 border-b border-[#26242E]/80">
        <Link to="/dashboard" className="flex items-center gap-3 group min-w-0">
          <img
            src="/syncstudy-logo-full.jpg"
            alt="SyncStudy"
            className="h-10 w-10 rounded-xl object-contain bg-white/5 p-1 border border-white/10 flex-shrink-0 group-hover:scale-105 transition-transform"
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                SyncStudy
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </span>
              <span className="text-[10px] text-white/50 font-medium tracking-wide">
                Focus • Plan • Practice
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path

          // Hide premium if active
          if (item.path === "/premium" && premiumActive) return null

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? "bg-[#7651E8] text-white shadow-lg shadow-[#7651E8]/30 font-semibold"
                  : "text-[#A8A2B3] hover:text-white hover:bg-white/[0.06]"
              }`}
              title={collapsed ? item.name : undefined}
            >
              <Icon
                className={`h-5 w-5 flex-shrink-0 transition-transform ${
                  isActive ? "text-white" : "text-[#8E8799] group-hover:text-white"
                }`}
              />
              {!collapsed && <span className="truncate">{item.name}</span>}
              {collapsed && isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Motivational Card at Bottom (from Reference Image C) */}
      {!collapsed && (
        <div className="mx-3 mb-3 p-3.5 rounded-2xl bg-gradient-to-br from-[#2D224C] via-[#211B35] to-[#1A162A] border border-purple-500/20 shadow-md">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider">
              SyncStudy Focus
            </span>
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-xs font-semibold text-white/95 leading-snug mb-1">
            Small Steps
            <br />
            Big Progress.
          </p>
          <p className="text-[10px] text-white/60">
            Keep your streak alive today.
          </p>
        </div>
      )}

      {/* Sidebar Controls Footer */}
      <div className="px-3 pb-4 pt-2 border-t border-[#26242E] space-y-2">
        {/* Theme Switcher */}
        <div
          className={`flex items-center ${
            collapsed ? "justify-center" : "justify-between px-2"
          } py-1`}
        >
          {!collapsed && (
            <span className="text-xs text-white/60 font-medium">Appearance</span>
          )}
          <ThemeToggle />
        </div>

        {/* Collapse Toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse Menu</span>
            </>
          )}
        </button>

        {/* Sign Out */}
        <button
          type="button"
          onClick={handleSignOut}
          className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
          title="Sign Out"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
