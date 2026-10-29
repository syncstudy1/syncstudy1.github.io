import { Link } from "react-router-dom"
import { Button } from "@/ui/button"
import { HelpCircle, ArrowLeft } from "lucide-react"

export function NotFoundPage() {
  return (
    <div className="page-shell flex-1 flex items-center justify-center p-4">
      <div className="surface-panel max-w-md w-full p-8 sm:p-10 rounded-3xl text-center space-y-5 shadow-xl border border-purple-200/60 dark:border-purple-900/40">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
          <HelpCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
            Page Not Found
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
        <div className="pt-2">
          <Link to="/">
            <Button className="gap-2 rounded-2xl bg-primary text-primary-foreground font-semibold px-6">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
