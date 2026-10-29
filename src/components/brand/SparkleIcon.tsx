import * as React from "react"

export function SparkleIcon({ size = 20, color = "#FB923C", className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs><linearGradient id="sparkle-gradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor={color} /><stop offset="1" stopColor="#FBBF24" /></linearGradient></defs>
      <path d="M12 1.5c1.7 6.2 4.3 8.8 10.5 10.5-6.2 1.7-8.8 4.3-10.5 10.5C10.3 16.3 7.7 13.7 1.5 12 7.7 10.3 10.3 7.7 12 1.5Z" fill="url(#sparkle-gradient)" />
    </svg>
  )
}
