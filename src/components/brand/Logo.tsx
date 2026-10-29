import * as React from "react"

type LogoVariant = "mark" | "wordmark" | "lockup"

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  variant?: LogoVariant
  dark?: boolean
}

export function Logo({ variant = "lockup", dark = false, className, ...props }: LogoProps) {
  const showMark = variant !== "wordmark"
  const showWordmark = variant !== "mark"
  const width = variant === "mark" ? 96 : variant === "wordmark" ? 310 : 360
  const height = variant === "mark" ? 96 : variant === "wordmark" ? 88 : 148

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label="SyncStudy" {...props}>
      <defs>
        <linearGradient id="logo-book" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C4B5FD" />
          <stop offset="0.55" stopColor="#FDBA9C" />
          <stop offset="1" stopColor="#FB7185" />
        </linearGradient>
        <linearGradient id="logo-pages" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="logo-orbit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.92" />
          <stop offset="0.5" stopColor="#F0ABFC" stopOpacity="0.86" />
          <stop offset="1" stopColor="#8B5CF6" stopOpacity="0.96" />
        </linearGradient>
        <linearGradient id="logo-word" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8B5CF6" />
          <stop offset="0.55" stopColor="#F472B6" />
          <stop offset="1" stopColor="#FB7185" />
        </linearGradient>
        <linearGradient id="logo-spark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FB923C" />
          <stop offset="1" stopColor="#FBBF24" />
        </linearGradient>
      </defs>
      {showMark && (
        <g transform={variant === "mark" ? "translate(0 0) scale(.375)" : "translate(0 2) scale(.375)"}>
          <path d="M56 123c-8-9-18-14-32-15-7-1-12 4-12 11v65c0 7 5 12 12 12 19 1 34 7 48 20V143c-3-8-8-14-16-20Z" fill="url(#logo-pages)" stroke="#7C3AED" strokeWidth="3" />
          <path d="M200 123c8-9 18-14 32-15 7-1 12 4 12 11v65c0 7-5 12-12 12-19 1-34 7-48 20V143c3-8 8-14 16-20Z" fill="url(#logo-book)" stroke="#E9A1C0" strokeWidth="3" />
          <path d="M64 107c20 2 43 13 64 36v69c-21-22-43-30-66-31-5 0-8-4-8-9v-52c0-9 4-14 10-13Z" fill="url(#logo-book)" fillOpacity=".84" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth="3" />
          <path d="M192 107c-20 2-43 13-64 36v69c21-22 43-30 66-31 5 0 8-4 8-9v-52c0-9-4-14-10-13Z" fill="url(#logo-book)" fillOpacity=".9" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth="3" />
          <path d="M30 132c-31 16-40 33-27 46 17 18 76 16 123-7 48-23 104-29 124-9 13 13 1 29-30 43" fill="none" stroke="url(#logo-orbit)" strokeWidth="8" strokeLinecap="round" />
          <path d="M31 132c-31 16-40 33-27 46" fill="none" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" />
          <path d="m226 54 5 13 13 5-13 5-5 13-5-13-13-5 13-5 5-13Z" fill="url(#logo-spark)" />
          <path d="m38 83 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" fill="#C084FC" />
          <path d="m237 111 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" fill="#C084FC" />
        </g>
      )}
      {showWordmark && (
        <g transform={variant === "lockup" ? "translate(112 24)" : "translate(0 8)"}>
          <text x="0" y="38" fontFamily="Plus Jakarta Sans, Manrope, sans-serif" fontSize="38" fontWeight="800" letterSpacing="-1.8" fill={dark ? "#F5F3FF" : "#1F1B2D"}>Sync</text>
          <text x="92" y="38" fontFamily="Plus Jakarta Sans, Manrope, sans-serif" fontSize="38" fontWeight="800" letterSpacing="-1.8" fill="url(#logo-word)">Study</text>
          {variant === "lockup" && <text x="1" y="67" fontFamily="Plus Jakarta Sans, Manrope, sans-serif" fontSize="10" fontWeight="600" letterSpacing="2.2" fill={dark ? "#C4BEDB" : "#8E89A3"}>FOCUS · PLAN · PRACTICE · GROW</text>}
        </g>
      )}
    </svg>
  )
}
