import * as React from "react"
import { Outlet } from "react-router-dom"
import { Navbar } from "./Navbar"
import { Sidebar } from "./Sidebar"
import { Footer } from "./Footer"
import { CursorSparkles } from "@/components/effects/CursorSparkles"
import { useAuthStore } from "@/stores/authStore"

export function Layout() {
  const { user } = useAuthStore()
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/20 transition-colors">
      {/* Liquid Glass Aurora sparkle cursor effect */}
      <CursorSparkles />

      {/* Desktop Persistent Sidebar (for logged-in users) */}
      {user && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          user ? (sidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-[240px]") : ""
        }`}
      >
        <Navbar collapsed={sidebarCollapsed} />
        <main className="flex-1 flex flex-col">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}
