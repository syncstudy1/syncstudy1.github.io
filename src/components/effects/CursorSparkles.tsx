import { useEffect, useRef } from "react"

const MAX_PARTICLES = 36
const MOVEMENT_INTERVAL = 90
const MOVEMENT_CHANCE = 0.45
const INTERACTIVE_SELECTOR =
  "a, button, [role=button], [role=tab], [role=menuitem], summary, input[type=submit], input[type=button]"

type ParticleKind = "star" | "dot"

function isEditableTarget(target: Element) {
  return (
    target.matches("input, textarea, select, [contenteditable=true]") ||
    Boolean(target.closest("input, textarea, select, [contenteditable=true]"))
  )
}

function isInteractiveTarget(target: Element) {
  return Boolean(target.closest(INTERACTIVE_SELECTOR))
}

function isExcludedInteractiveTarget(target: Element) {
  const interactive = target.closest(INTERACTIVE_SELECTOR)
  if (!(interactive instanceof HTMLElement)) return false

  return (
    interactive.dataset.sparkle === "off" ||
    interactive.dataset.sparkleDestructive === "true" ||
    interactive.matches("button[type=reset]")
  )
}

export function CursorSparkles() {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeParticlesRef = useRef<HTMLElement[]>([])
  const lastMovementRef = useRef(0)
  const lastPointerTypeRef = useRef<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const shouldReduceMotion = () => reducedMotionQuery.matches

    const removeParticle = (particle: HTMLElement) => {
      particle.remove()
      activeParticlesRef.current = activeParticlesRef.current.filter((item) => item !== particle)
    }

    const createParticle = (
      x: number,
      y: number,
      kind: ParticleKind,
      burst: boolean,
      angle = Math.random() * Math.PI * 2,
    ) => {
      if (activeParticlesRef.current.length >= MAX_PARTICLES) {
        removeParticle(activeParticlesRef.current[0])
      }

      const particle = document.createElement("span")
      const distance = burst ? 18 + Math.random() * 18 : 5 + Math.random() * 9
      const duration = burst ? 600 + Math.random() * 200 : 500 + Math.random() * 250
      const size = kind === "star" ? (burst ? 27 : 20) : burst ? 3.5 : 2.5
      const rotation = (Math.random() - 0.5) * 18

      particle.className = `cursor-sparkle cursor-sparkle--${kind}`
      particle.style.left = `${x}px`
      particle.style.top = `${y}px`
      particle.style.setProperty("--sparkle-size", `${size}px`)
      particle.style.setProperty("--sparkle-x", `${Math.cos(angle) * distance}px`)
      particle.style.setProperty("--sparkle-y", `${Math.sin(angle) * distance}px`)
      particle.style.setProperty("--sparkle-duration", `${duration}ms`)
      particle.style.setProperty("--sparkle-rotation", `${rotation}deg`)
      container.appendChild(particle)
      activeParticlesRef.current.push(particle)

      particle.addEventListener("animationend", () => removeParticle(particle), { once: true })
    }

    const spawnMovementSparkle = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || shouldReduceMotion()) return
      const now = performance.now()
      if (now - lastMovementRef.current < MOVEMENT_INTERVAL || Math.random() > MOVEMENT_CHANCE) return
      lastMovementRef.current = now

      const count = Math.random() > 0.7 ? 2 : 1
      for (let index = 0; index < count; index += 1) {
        createParticle(
          event.clientX + (Math.random() - 0.5) * 10,
          event.clientY + (Math.random() - 0.5) * 10,
          Math.random() > 0.65 ? "dot" : "star",
          false,
        )
      }
    }

    const rememberPointerType = (event: PointerEvent) => {
      lastPointerTypeRef.current = event.pointerType
    }

    const spawnClickBurst = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (!target || !isInteractiveTarget(target) || isEditableTarget(target)) return
      if (shouldReduceMotion()) return
      if (isExcludedInteractiveTarget(target)) return

      const interactive = target.closest(INTERACTIVE_SELECTOR)

      const pointerType = lastPointerTypeRef.current
      const bounds = interactive?.getBoundingClientRect()
      const hasPointerCoordinates = event.clientX !== 0 || event.clientY !== 0
      const x = hasPointerCoordinates ? event.clientX : (bounds?.left || 0) + (bounds?.width || 0) / 2
      const y = hasPointerCoordinates ? event.clientY : (bounds?.top || 0) + (bounds?.height || 0) / 2
      const isTouch = pointerType === "touch"
      const count = isTouch ? 4 : 6 + Math.floor(Math.random() * 3)

      for (let index = 0; index < count; index += 1) {
        createParticle(x, y, "star", true, (Math.PI * 2 * index) / count)
      }
      lastPointerTypeRef.current = null
    }

    document.addEventListener("pointermove", spawnMovementSparkle, { passive: true })
    document.addEventListener("pointerdown", rememberPointerType, { passive: true })
    document.addEventListener("click", spawnClickBurst)

    return () => {
      document.removeEventListener("pointermove", spawnMovementSparkle)
      document.removeEventListener("pointerdown", rememberPointerType)
      document.removeEventListener("click", spawnClickBurst)
      activeParticlesRef.current = []
      container.replaceChildren()
    }
  }, [])

  return <div ref={containerRef} className="cursor-sparkles" aria-hidden="true" />
}
