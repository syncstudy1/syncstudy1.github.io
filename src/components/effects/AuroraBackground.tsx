import { useEffect, useRef } from "react"

export function AuroraBackground() {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const glow = glowRef.current
    if (!glow || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(pointer: fine)").matches) return
    let frame = 0
    let targetX = window.innerWidth * 0.5
    let targetY = window.innerHeight * 0.35
    let x = targetX
    let y = targetY
    const move = (event: PointerEvent) => { targetX = event.clientX; targetY = event.clientY }
    const animate = () => {
      x += (targetX - x) * 0.08
      y += (targetY - y) * 0.08
      glow.style.transform = `translate3d(${x - 260}px, ${y - 260}px, 0)`
      frame = requestAnimationFrame(animate)
    }
    window.addEventListener("pointermove", move, { passive: true })
    frame = requestAnimationFrame(animate)
    return () => { window.removeEventListener("pointermove", move); cancelAnimationFrame(frame) }
  }, [])

  return <div className="aurora-background" aria-hidden="true"><div ref={glowRef} className="aurora-cursor-glow" /><div className="aurora-noise" /></div>
}
