import { Outlet } from "react-router-dom"
import { Navbar } from "./Navbar"
import { Footer } from "./Footer"
import { CursorSparkles } from "@/components/effects/CursorSparkles"
import { AuroraBackground } from "@/components/effects/AuroraBackground"

export function Layout() {
  return (
    <div className="app-frame min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-indigo-500/20">
      <AuroraBackground />
      <CursorSparkles />
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
