import * as React from "react"
import { useStudyTimer } from "@/hooks/useStudyTimer"
import { useSubjects } from "@/hooks/useSubjects"
import { useTasks } from "@/hooks/useTasks"
import { useStudySessions } from "@/hooks/useStudySessions"
import { useQualifyingActivity } from "@/hooks/useQualifyingActivity"
import { useSubscriptionStore } from "@/stores/subscriptionStore"
import { calculateStreakStats, getLocalDateKeyFromTimestamp } from "@/lib/activity"
import { Button } from "@/ui/button"
import { Badge } from "@/ui/badge"
import { Switch } from "@/ui/switch"
import { Input } from "@/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/ui/dialog"
import { useToast } from "@/ui/toast"
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  BookOpen,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Sliders,
  Flame,
  Target,
  Music,
  Eye,
  X,
  Volume1,
} from "lucide-react"
import type { TaskStatus } from "@/types/database"
import { CameraMonitor } from "@/components/vision/CameraMonitor"

const PRESET_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
]

interface Buddy {
  id: string
  name: string
  themeName: string
  description: string
  avatar: string
  background: string
  accentColor: string
  ambientPreset: string
}

const STUDY_BUDDIES: Buddy[] = [
  {
    id: "cat",
    name: "Cosy Cat",
    themeName: "Cosy Library Study",
    description: "A peaceful, warm study room at sunset with books, plants, and a sleeping cat.",
    avatar: "/assets/buddies/cat.png",
    background: "/assets/rooms/room-cat.jpg",
    accentColor: "#FF9B7A",
    ambientPreset: "Lo-fi Study",
  },
  {
    id: "panda",
    name: "Zen Panda",
    themeName: "Bamboo Sanctuary",
    description: "Tranquil bamboo forest sanctuary with misty stones and warm tea.",
    avatar: "/assets/buddies/panda.png",
    background: "/assets/rooms/room-panda.jpg",
    accentColor: "#5DAD7A",
    ambientPreset: "Forest",
  },
  {
    id: "dog",
    name: "Sunny Dog",
    themeName: "Sunny Garden Study",
    description: "An energetic, welcoming garden porch with morning sunlight and green grass.",
    avatar: "/assets/buddies/dog.png",
    background: "/assets/rooms/room-dog.jpg",
    accentColor: "#E9A23B",
    ambientPreset: "Cafe",
  },
  {
    id: "fox",
    name: "Forest Fox",
    themeName: "Rainforest Hideaway",
    description: "Lush treehouse canopy hideaway with ferns, amber lantern, and tropical foliage.",
    avatar: "/assets/buddies/fox.png",
    background: "/assets/rooms/room-fox.jpg",
    accentColor: "#FF7A45",
    ambientPreset: "Rain",
  },
  {
    id: "dolphin",
    name: "Aqua Dolphin",
    themeName: "Peaceful Ocean View",
    description: "Serene oceanfront study deck overlooking crystal turquoise waves.",
    avatar: "/assets/buddies/dolphin.png",
    background: "/assets/rooms/room-dolphin.jpg",
    accentColor: "#38BDF8",
    ambientPreset: "Waves",
  },
  {
    id: "parrot",
    name: "Canopy Parrot",
    themeName: "Amazon Forest Retreat",
    description: "Vibrant tropical jungle canopy study platform with warm sunbeams.",
    avatar: "/assets/buddies/parrot.png",
    background: "/assets/rooms/room-parrot.jpg",
    accentColor: "#10B981",
    ambientPreset: "Forest",
  },
  {
    id: "penguin",
    name: "Arctic Penguin",
    themeName: "Arctic Focus Cabin",
    description: "Cozy timber cabin with glowing fireplace overlooking snowy twilight peaks and aurora.",
    avatar: "/assets/buddies/penguin.png",
    background: "/assets/rooms/room-penguin.jpg",
    accentColor: "#A78BFA",
    ambientPreset: "Lo-fi Study",
  },
  {
    id: "dino",
    name: "Focus Dino",
    themeName: "Prehistoric Grove",
    description: "A cozy ancient woodland retreat with giant fern leaves and gentle breeze.",
    avatar: "/assets/buddies/dino.png",
    background: "/assets/rooms/room-fox.jpg",
    accentColor: "#84CC16",
    ambientPreset: "Rain",
  },
]

const AMBIENT_SOUNDS = [
  { id: "lofi", name: "Lo-fi Study", category: "Lo-fi", icon: "🎵" },
  { id: "rain", name: "Rain", category: "Rain", icon: "🌧️" },
  { id: "cafe", name: "Cafe", category: "Cafe", icon: "☕" },
  { id: "forest", name: "Forest", category: "Nature", icon: "🌲" },
  { id: "waves", name: "Waves", category: "Nature", icon: "🌊" },
]

function formatSeconds(totalSecs: number): string {
  const hrs = Math.floor(totalSecs / 3600)
  const mins = Math.floor((totalSecs % 3600) / 60)
  const secs = totalSecs % 60
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

export function StudySessionPage() {
  const { toast } = useToast()
  const { isPremium } = useSubscriptionStore()
  const { subjects, createSubject, deleteSubject } = useSubjects()
  const { tasks, createTask, updateTaskStatus, deleteTask } = useTasks()
  const { saveSession, todayTotalSeconds } = useStudySessions()
  const { activities } = useQualifyingActivity()

  const {
    elapsed,
    plannedDuration,
    status,
    warningCount,
    autoPaused,
    isHeld,
    holdReason,
    start,
    pause,
    resume,
    stop,
    reset,
    addWarning,
    clearAutoPause,
    holdTimer,
    releaseTimerHold,
  } = useStudyTimer()

  // Selected Study Buddy (persisted in localStorage)
  const [selectedBuddyId, setSelectedBuddyId] = React.useState<string>(() => {
    return localStorage.getItem("syncstudy-buddy") || "cat"
  })

  // Subject & Task state
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>("")
  const [selectedTaskId] = React.useState<string>("")
  const [sessionNotes] = React.useState<string>("")
  const [durationMinutes, setDurationMinutes] = React.useState<number>(25)
  const [breakDurationMinutes, setBreakDurationMinutes] = React.useState<number>(5)
  const [cycles, setCycles] = React.useState<number>(4)
  const [completedCycles, setCompletedCycles] = React.useState<number>(0)
  const [autoStartBreaks, setAutoStartBreaks] = React.useState<boolean>(true)
  const [playEndSound, setPlayEndSound] = React.useState<boolean>(true)

  // Vision Camera Monitoring state
  const [enableCamera, setEnableCamera] = React.useState<boolean>(false)
  const [showCameraPanel, setShowCameraPanel] = React.useState<boolean>(false)
  const [startTimeIso, setStartTimeIso] = React.useState<string>("")

  // Summary dialog state
  const [summaryOpen, setSummaryOpen] = React.useState<boolean>(false)
  const [completedElapsed, setCompletedElapsed] = React.useState<number>(0)
  const [finalNotes, setFinalNotes] = React.useState<string>("")

  // Ambient sound synthesizer state
  const [activeSound, setActiveSound] = React.useState<string | null>(null)
  const [soundCategory, setSoundCategory] = React.useState<string>("All")
  const [volume, setVolume] = React.useState<number>(70)
  const audioCtxRef = React.useRef<AudioContext | null>(null)
  const soundNodesRef = React.useRef<{ [key: string]: any }>({})

  // Panels & Fullscreen
  const [showSettingsPanel, setShowSettingsPanel] = React.useState<boolean>(false)
  const [showManagement, setShowManagement] = React.useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Add Subject / Task form state
  const [newSubName, setNewSubName] = React.useState<string>("")
  const [newSubColor, setNewSubColor] = React.useState<string>(PRESET_COLORS[0])
  const [isAddingSub, setIsAddingSub] = React.useState<boolean>(false)
  const [newTaskTitle, setNewTaskTitle] = React.useState<string>("")
  const [isAddingTask, setIsAddingTask] = React.useState<boolean>(false)

  // Current Buddy object
  const currentBuddy = React.useMemo(() => {
    return STUDY_BUDDIES.find((b) => b.id === selectedBuddyId) || STUDY_BUDDIES[0]
  }, [selectedBuddyId])

  // Auto-select first subject
  React.useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id)
    }
  }, [subjects, selectedSubjectId])

  // Save selected buddy to localStorage
  const handleSelectBuddy = (buddyId: string) => {
    setSelectedBuddyId(buddyId)
    localStorage.setItem("syncstudy-buddy", buddyId)
  }

  // Web Audio Ambient Synthesizer
  const stopAmbientSound = () => {
    try {
      if (soundNodesRef.current.osc) {
        soundNodesRef.current.osc.stop()
      }
      if (soundNodesRef.current.gain) {
        soundNodesRef.current.gain.disconnect()
      }
      if (soundNodesRef.current.filter) {
        soundNodesRef.current.filter.disconnect()
      }
    } catch (e) {
      // Audio already stopped
    }
    soundNodesRef.current = {}
    setActiveSound(null)
  }

  const startAmbientSound = (soundId: string) => {
    stopAmbientSound()

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === "suspended") {
        ctx.resume()
      }

      const gain = ctx.createGain()
      gain.gain.value = (volume / 100) * 0.25

      if (soundId === "rain" || soundId === "waves") {
        // Pink / Brown noise buffer for rain and waves
        const bufferSize = ctx.sampleRate * 2
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const output = noiseBuffer.getChannelData(0)
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1
          b0 = 0.99886 * b0 + white * 0.0555179
          b1 = 0.99332 * b1 + white * 0.0750759
          b2 = 0.96900 * b2 + white * 0.1538520
          b3 = 0.86650 * b3 + white * 0.3104856
          b4 = 0.55000 * b4 + white * 0.5329522
          b5 = -0.7616 * b5 - white * 0.0168980
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
          b6 = white * 0.115926
        }

        const whiteNoise = ctx.createBufferSource()
        whiteNoise.buffer = noiseBuffer
        whiteNoise.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = soundId === "rain" ? "lowpass" : "bandpass"
        filter.frequency.value = soundId === "rain" ? 800 : 400

        whiteNoise.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)
        whiteNoise.start(0)

        soundNodesRef.current = { osc: whiteNoise, gain, filter }
      } else {
        // Soft lofi / cafe warm drone pad
        const osc = ctx.createOscillator()
        const filter = ctx.createBiquadFilter()
        osc.type = "sine"
        osc.frequency.value = soundId === "lofi" ? 220 : 174 // Warm A3 or F3
        filter.type = "lowpass"
        filter.frequency.value = 450

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)
        osc.start()

        soundNodesRef.current = { osc, gain, filter }
      }

      setActiveSound(soundId)
    } catch (err) {
      console.warn("Web Audio ambient synthesizer not supported", err)
      setActiveSound(soundId)
    }
  }

  // Update volume
  React.useEffect(() => {
    if (soundNodesRef.current.gain) {
      soundNodesRef.current.gain.gain.value = (volume / 100) * 0.25
    }
  }, [volume])

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  // Start Session
  const handleStart = () => {
    const plannedSecs = durationMinutes * 60
    setStartTimeIso(new Date().toISOString())
    start(plannedSecs)
    if (enableCamera) {
      holdTimer("Calibrating camera focus monitor...")
    }
  }

  // Stop Session
  const handleStop = () => {
    const finalElapsed = stop()
    setCompletedElapsed(finalElapsed)
    setFinalNotes(sessionNotes)
    setSummaryOpen(true)
  }

  // Reset Session
  const handleReset = () => {
    reset()
  }

  // Save Session
  const handleSaveSession = async () => {
    try {
      await saveSession({
        subject_id: selectedSubjectId || undefined,
        started_at: startTimeIso || new Date().toISOString(),
        ended_at: new Date().toISOString(),
        planned_duration_s: plannedDuration,
        actual_duration_s: completedElapsed,
        warning_count: warningCount,
        auto_paused: autoPaused,
        notes: finalNotes || undefined,
      })

      if (selectedTaskId) {
        await updateTaskStatus(selectedTaskId, "in_progress")
      }

      setCompletedCycles((c) => c + 1)
      toast({
        title: "Session Saved!",
        description: `Logged ${formatSeconds(completedElapsed)} of deep focus. Keep going!`,
        type: "success",
      })

      setSummaryOpen(false)
      reset()
    } catch (err) {
      toast({
        title: "Could not save session",
        description: "Please check your network connection and try again.",
        type: "error",
      })
    }
  }

  const handleDiscardSession = () => {
    setSummaryOpen(false)
    reset()
  }

  // Create Subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubName.trim()) return
    setIsAddingSub(true)
    try {
      const created = await createSubject(newSubName.trim(), newSubColor)
      setSelectedSubjectId(created.id)
      setNewSubName("")
      toast({ title: "Subject Added", description: `Added "${created.name}"`, type: "success" })
    } catch (err) {
      toast({ title: "Failed to add subject", type: "error" })
    } finally {
      setIsAddingSub(false)
    }
  }

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    setIsAddingTask(true)
    try {
      await createTask({
        title: newTaskTitle.trim(),
        subject_id: selectedSubjectId || subjects[0]?.id,
      })
      setNewTaskTitle("")
      toast({ title: "Task Added", type: "success" })
    } catch (err) {
      toast({ title: "Failed to add task", type: "error" })
    } finally {
      setIsAddingTask(false)
    }
  }

  // Camera monitoring readiness callback
  const handleMonitoringReady = React.useCallback(
    (isReady: boolean) => {
      if (isReady && isHeld) {
        releaseTimerHold()
      }
    },
    [isHeld, releaseTimerHold]
  )

  // Circular timer calculations
  const remainingSeconds = Math.max(0, plannedDuration - elapsed)
  const timerRadius = 140
  const circumference = 2 * Math.PI * timerRadius
  const progressRatio = plannedDuration > 0 ? Math.min(1, elapsed / plannedDuration) : 0
  const strokeDashoffset = circumference - progressRatio * circumference

  // Subject object
  const currentSubject = subjects.find((s) => s.id === selectedSubjectId)

  // Filtered ambient sounds
  const filteredSounds = AMBIENT_SOUNDS.filter(
    (s) => soundCategory === "All" || s.category === soundCategory
  )

  return (
    <div ref={containerRef} className="page-shell pb-16">
      <div className="page-container space-y-6 max-w-7xl">
        {/* Top Header Bar (inspired by Reference Image D) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display flex items-center gap-2.5">
                <span>Study Room</span>
                <span className="text-xl sm:text-2xl">☕</span>
              </h1>
              <Badge variant="outline" className="text-xs font-semibold border-purple-300/80 text-primary bg-primary/10">
                {currentBuddy.name}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              A focused mind can turn small study sessions into big achievements.
            </p>
          </div>

          {/* Action Pills: Ambient Sounds, Fullscreen, Vision Monitor */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeSound) {
                  stopAmbientSound()
                } else {
                  startAmbientSound("lofi")
                }
              }}
              className={`h-9 px-3 rounded-xl gap-2 text-xs font-semibold border-border/80 ${
                activeSound ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
              }`}
            >
              <Music className="h-4 w-4" />
              <span>{activeSound ? "Ambient: Playing" : "Ambient Sounds"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="h-9 px-3 rounded-xl gap-2 text-xs font-semibold bg-card border-border/80 hover:bg-muted"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{isFullscreen ? "Exit" : "Fullscreen"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCameraPanel(!showCameraPanel)
                if (!enableCamera) setEnableCamera(true)
              }}
              className={`h-9 px-3 rounded-xl gap-2 text-xs font-semibold border-border/80 ${
                showCameraPanel ? "bg-amber-500/15 text-amber-600 border-amber-500/30" : "bg-card hover:bg-muted"
              }`}
            >
              <Camera className="h-4 w-4 text-amber-500" />
              <span>{showCameraPanel ? "Close Monitor" : "Vision Monitor"}</span>
            </Button>
          </div>
        </div>

        {/* Auto-pause banner if triggered */}
        {autoPaused && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-200 animate-fade-in shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-500 flex-shrink-0 animate-bounce" />
              <p className="text-sm font-semibold">
                Auto-paused after 3 distraction warnings. Take a breath, refocus on your screen, and resume when ready.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                clearAutoPause()
                resume()
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs h-8 px-4"
            >
              Refocus & Resume
            </Button>
          </div>
        )}

        {/* Main Grid: Illustrated Environment Center-Left + Side Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Illustrated Study Room Environment (Cols 1 to 8 on desktop) */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            <div
              className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-white/20 dark:border-white/10 min-h-[460px] sm:min-h-[520px] lg:min-h-[560px] flex flex-col justify-between p-5 sm:p-7 bg-cover bg-center transition-all duration-700 ease-out"
              style={{
                backgroundImage: `url(${currentBuddy.background})`,
                backgroundColor: "#2B213A",
              }}
            >
              {/* Soft overlay gradient to ensure high legibility of timer & controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/35 pointer-events-none" />

              {/* Top Row inside Environment: Subject Selector Pill & Buddy Badge */}
              <div className="relative z-10 flex items-center justify-between flex-wrap gap-3">
                {/* Floating Subject Selector (from Reference Image D) */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 text-white shadow-lg">
                    <BookOpen className="w-4 h-4 text-purple-300" />
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="bg-transparent text-xs sm:text-sm font-semibold text-white focus:outline-none cursor-pointer pr-1"
                    >
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id} className="text-black bg-white">
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Buddy Badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 text-white shadow-lg">
                  <img
                    src={currentBuddy.avatar}
                    alt={currentBuddy.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="text-xs font-semibold">{currentBuddy.name}</span>
                </div>
              </div>

              {/* Central Circular Focus Timer (from Reference Image D) */}
              <div className="relative z-10 flex flex-col items-center justify-center my-auto py-6">
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                  {/* Frosted circular backdrop panel */}
                  <div className="absolute inset-2 rounded-full bg-white/15 dark:bg-black/35 backdrop-blur-xl border border-white/25 shadow-2xl" />

                  {/* SVG Animated Circular Progress Ring */}
                  <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 320 320">
                    <defs>
                      <linearGradient id="timer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#A78BFA" />
                        <stop offset="50%" stopColor="#7651E8" />
                        <stop offset="100%" stopColor="#FF9B7A" />
                      </linearGradient>
                    </defs>
                    {/* Background Ring */}
                    <circle
                      cx="160"
                      cy="160"
                      r={timerRadius}
                      className="stroke-white/20"
                      strokeWidth="10"
                      fill="none"
                    />
                    {/* Active Progress Ring */}
                    <circle
                      cx="160"
                      cy="160"
                      r={timerRadius}
                      stroke="url(#timer-grad)"
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="none"
                      className="timer-ring transition-all duration-1000 ease-linear"
                    />
                  </svg>

                  {/* Central Text & Digits */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
                    <span className="text-4xl sm:text-5xl font-black text-white tracking-tight tabular-nums drop-shadow-md">
                      {status === "idle"
                        ? `${String(durationMinutes).padStart(2, "0")}:00`
                        : formatSeconds(remainingSeconds)}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-white/80 mt-1">
                      {status === "paused"
                        ? "Session Paused"
                        : status === "running"
                        ? "Focus Time"
                        : "Ready to Focus"}
                    </span>
                    {isHeld && (
                      <span className="text-[10px] text-amber-300 font-medium px-2 py-0.5 rounded-full bg-amber-950/60 mt-1 animate-pulse">
                        {holdReason || "Timer held"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Primary Timer Controls (Settings, Play/Pause, Reset, Finish) */}
                <div className="flex items-center gap-4 mt-6 z-20">
                  {/* Settings toggle */}
                  <button
                    type="button"
                    onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                    className="h-11 w-11 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white flex items-center justify-center transition-all hover:scale-105 shadow-lg"
                    title="Session settings"
                  >
                    <Sliders className="h-5 w-5" />
                  </button>

                  {/* Main Play / Pause Button (large purple circle with shadow) */}
                  {status === "idle" ? (
                    <button
                      type="button"
                      onClick={handleStart}
                      className="h-16 w-16 rounded-full bg-gradient-to-tr from-[#7651E8] to-[#9F7AEA] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-600/40 border-2 border-white/40"
                      title="Start Session"
                    >
                      <Play className="h-7 w-7 fill-white translate-x-0.5" />
                    </button>
                  ) : status === "running" ? (
                    <button
                      type="button"
                      onClick={pause}
                      className="h-16 w-16 rounded-full bg-gradient-to-tr from-[#7651E8] to-[#9F7AEA] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-600/40 border-2 border-white/40"
                      title="Pause Session"
                    >
                      <Pause className="h-7 w-7 fill-white" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={resume}
                      className="h-16 w-16 rounded-full bg-gradient-to-tr from-[#7651E8] to-[#9F7AEA] text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-600/40 border-2 border-white/40"
                      title="Resume Session"
                    >
                      <Play className="h-7 w-7 fill-white translate-x-0.5" />
                    </button>
                  )}

                  {/* Reset button */}
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={status === "idle"}
                    className="h-11 w-11 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-40 backdrop-blur-md border border-white/30 text-white flex items-center justify-center transition-all hover:scale-105 shadow-lg"
                    title="Reset Session"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>

                  {/* Stop / Finish Session button */}
                  {status !== "idle" && (
                    <button
                      type="button"
                      onClick={handleStop}
                      className="h-11 w-11 rounded-full bg-rose-500/80 hover:bg-rose-600 backdrop-blur-md border border-white/30 text-white flex items-center justify-center transition-all hover:scale-105 shadow-lg"
                      title="Finish and Save Session"
                    >
                      <Square className="h-4 w-4 fill-white" />
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom Quote Bar & Cycles Indicator (from Reference Image D) */}
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 text-white/90 shadow-lg">
                <p className="text-xs sm:text-sm font-medium italic">
                  &ldquo;Stay focused. Good things take time.&rdquo;
                </p>
                <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                  <span>Session {completedCycles}/{cycles}</span>
                  <div className="flex gap-1.5 ml-1">
                    {Array.from({ length: cycles }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-2 w-2 rounded-full ${
                          i < completedCycles ? "bg-emerald-400" : "bg-white/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 3 Summary Cards (Today's Goal, Streak, Today's Focus) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Today's Goal */}
              <div className="surface-panel p-4 flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center flex-shrink-0">
                  <Target className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Today's Goal</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Study {currentSubject?.name || "Topics"} for {durationMinutes}m
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary flex items-center justify-center text-[10px] font-bold text-primary">
                  {Math.min(100, Math.round((todayTotalSeconds / (durationMinutes * 60)) * 100))}%
                </div>
              </div>

              {/* Focus Streak */}
              <div className="surface-panel p-4 flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Focus Streak</p>
                  <p className="text-sm font-extrabold text-foreground tabular-nums">
                    {calculateStreakStats(new Set(activities.map((a) => a.activity_date))).currentStreak} Days
                  </p>
                  <p className="text-[10px] text-muted-foreground">Keep momentum alive!</p>
                </div>
              </div>

              {/* Today's Focus */}
              <div className="surface-panel p-4 flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Today's Focus</p>
                  <p className="text-sm font-extrabold text-foreground tabular-nums">
                    {Math.round(todayTotalSeconds / 60)} min
                  </p>
                  <p className="text-[10px] text-muted-foreground">Keep going!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Buddy Selector, Session Settings, Ambient Sound (from Reference Image D) */}
          <div className="lg:col-span-4 space-y-5">
            {/* 1. Choose Your Buddy Card (from Reference Image D) */}
            <div className="surface-panel p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Choose Your Buddy</h2>
                  <p className="text-[11px] text-muted-foreground">A study buddy keeps you motivated!</p>
                </div>
              </div>

              {/* 4x2 Grid of Buddy Icons */}
              <div className="grid grid-cols-4 gap-2.5">
                {STUDY_BUDDIES.map((buddy) => {
                  const isSelected = selectedBuddyId === buddy.id
                  return (
                    <button
                      key={buddy.id}
                      type="button"
                      onClick={() => handleSelectBuddy(buddy.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-200 group ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-md scale-[1.03] ring-2 ring-primary/30"
                          : "border-border/60 bg-card hover:bg-muted/60 hover:scale-105"
                      }`}
                      title={`${buddy.name} • ${buddy.themeName}`}
                    >
                      <img
                        src={buddy.avatar}
                        alt={buddy.name}
                        className="w-10 h-10 object-contain drop-shadow-sm group-hover:scale-110 transition-transform"
                      />
                      <span className="text-[10px] font-semibold text-foreground mt-1 truncate max-w-full">
                        {buddy.name.split(" ")[1] || buddy.name}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-muted-foreground text-center italic pt-1">
                {currentBuddy.description}
              </p>
            </div>

            {/* 2. Session Settings Panel (from Reference Image D) */}
            <div className="surface-panel p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Session Settings</h2>
                </div>
                <button
                  type="button"
                  onClick={() => toast({ title: "Preferences Saved", type: "success" })}
                  className="text-[10px] font-semibold text-primary hover:underline"
                >
                  Save as Default
                </button>
              </div>

              {/* Focus Duration Stepper */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Focus Duration (min)</span>
                <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setDurationMinutes(Math.max(5, durationMinutes - 5))}
                    disabled={status !== "idle"}
                    className="text-muted-foreground hover:text-foreground font-bold px-1"
                  >
                    -
                  </button>
                  <span className="font-bold text-foreground w-6 text-center tabular-nums">
                    {durationMinutes}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDurationMinutes(Math.min(120, durationMinutes + 5))}
                    disabled={status !== "idle"}
                    className="text-muted-foreground hover:text-foreground font-bold px-1"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Break Duration Stepper */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Break Duration (min)</span>
                <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setBreakDurationMinutes(Math.max(1, breakDurationMinutes - 1))}
                    className="text-muted-foreground hover:text-foreground font-bold px-1"
                  >
                    -
                  </button>
                  <span className="font-bold text-foreground w-6 text-center tabular-nums">
                    {breakDurationMinutes}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBreakDurationMinutes(Math.min(30, breakDurationMinutes + 1))}
                    className="text-muted-foreground hover:text-foreground font-bold px-1"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Cycles Stepper */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Cycles</span>
                <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setCycles(Math.max(1, cycles - 1))}
                    className="text-muted-foreground hover:text-foreground font-bold px-1"
                  >
                    -
                  </button>
                  <span className="font-bold text-foreground w-6 text-center tabular-nums">{cycles}</span>
                  <button
                    type="button"
                    onClick={() => setCycles(Math.min(12, cycles + 1))}
                    className="text-muted-foreground hover:text-foreground font-bold px-1"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Auto Start Breaks Switch */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-medium text-foreground">Auto Start Breaks</span>
                <Switch checked={autoStartBreaks} onCheckedChange={setAutoStartBreaks} />
              </div>

              {/* Play End Sound Switch */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Play End Sound</span>
                <Switch checked={playEndSound} onCheckedChange={setPlayEndSound} />
              </div>
            </div>

            {/* 3. Ambient Mode Card (from Reference Image D) */}
            <div className="surface-panel p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Ambient Mode</h2>
                </div>
                {activeSound && (
                  <button
                    type="button"
                    onClick={stopAmbientSound}
                    className="text-[10px] font-semibold text-rose-500 hover:underline"
                  >
                    Mute
                  </button>
                )}
              </div>

              {/* Sound Category Pills */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {["All", "Nature", "Lo-fi", "Rain", "Cafe"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSoundCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      soundCategory === cat
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Sound Options Horizontal Row */}
              <div className="grid grid-cols-3 gap-2">
                {filteredSounds.slice(0, 3).map((sound) => {
                  const isPlaying = activeSound === sound.id
                  return (
                    <button
                      key={sound.id}
                      type="button"
                      onClick={() => {
                        if (isPlaying) {
                          stopAmbientSound()
                        } else {
                          startAmbientSound(sound.id)
                        }
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                        isPlaying
                          ? "border-primary bg-primary/10 shadow-sm font-semibold"
                          : "border-border/60 bg-card hover:bg-muted"
                      }`}
                    >
                      <span className="text-lg mb-1">{sound.icon}</span>
                      <span className="text-[10px] font-medium text-foreground truncate w-full">
                        {sound.name}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Volume Slider Control */}
              <div className="flex items-center gap-3 pt-2">
                <Volume1 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 rounded-full bg-muted cursor-pointer"
                />
                <span className="text-[11px] font-semibold text-muted-foreground w-8 text-right tabular-nums">
                  {volume}%
                </span>
              </div>
            </div>

            {/* 4. Collapsible Subject & Task Backlog Toggle */}
            <button
              type="button"
              onClick={() => setShowManagement(!showManagement)}
              className="w-full surface-panel p-3.5 flex items-center justify-between text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>Subject & Task Manager</span>
              </span>
              {showManagement ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Vision Focus Monitoring Floating Modal / Overlay */}
        {showCameraPanel && (
          <div className="surface-panel p-5 space-y-4 max-w-2xl mx-auto border-2 border-primary/20 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Computer Vision Focus Guard</h3>
                  <p className="text-xs text-muted-foreground">
                    MediaPipe head-pose detection tracks your attention privately on-device.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCameraPanel(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <CameraMonitor
              onWarning={addWarning}
              isSessionRunning={status === "running"}
              isPremium={isPremium()}
              sessionElapsedSeconds={elapsed}
              onMonitoringReady={handleMonitoringReady}
            />
          </div>
        )}

        {/* Collapsible Subject & Task Backlog Drawer (preserved functionality) */}
        {showManagement && (
          <div className="surface-panel p-6 space-y-6 animate-fade-in border-t border-border">
            <h2 className="text-lg font-bold text-foreground">Subjects & Task Backlog</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Subjects Management */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Your Study Subjects
                </h3>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {subjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: sub.color }} />
                        <span>{sub.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteSubject(sub.id)}
                        className="text-muted-foreground hover:text-rose-500 p-1"
                        title="Delete subject"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add subject form */}
                <form onSubmit={handleCreateSubject} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      placeholder="New subject name..."
                      className="flex-1 h-9 px-3 rounded-xl bg-card border border-border text-xs focus:ring-2 focus:ring-primary/40"
                    />
                    <Button type="submit" size="sm" disabled={isAddingSub || !newSubName.trim()} className="h-9">
                      Add
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewSubColor(c)}
                        className={`h-5 w-5 rounded-full transition-transform ${newSubColor === c ? "scale-125 ring-2 ring-primary ring-offset-1" : "hover:scale-110"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </form>
              </div>

              {/* Tasks Management */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Tasks Backlog
                </h3>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {tasks.slice(0, 6).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card text-xs"
                    >
                      <span className={`font-medium truncate ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {t.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateTaskStatus(t.id, t.status === "done" ? "pending" : "done")}
                        className="text-muted-foreground hover:text-primary p-1"
                      >
                        {t.status === "done" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Clock className="h-4 w-4" />}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add task form */}
                <form onSubmit={handleCreateTask} className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="New task title..."
                    className="flex-1 h-9 px-3 rounded-xl bg-card border border-border text-xs focus:ring-2 focus:ring-primary/40"
                  />
                  <Button type="submit" size="sm" disabled={isAddingTask || !newTaskTitle.trim()} className="h-9">
                    Add
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Summary Dialog (Preserved functionality from original page) */}
        <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Session Complete!
              </DialogTitle>
              <DialogDescription>
                Great job sticking to your study schedule. Review your session summary below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/60 text-xs">
                <div>
                  <span className="text-muted-foreground">Subject:</span>
                  <p className="font-bold text-foreground text-sm">{currentSubject?.name || "Independent"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Focused Duration:</span>
                  <p className="font-bold text-foreground text-sm tabular-nums">{formatSeconds(completedElapsed)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Target Duration:</span>
                  <p className="font-bold text-foreground text-sm tabular-nums">{formatSeconds(plannedDuration)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Distraction Warnings:</span>
                  <p className="font-bold text-foreground text-sm">{warningCount}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Session Notes</label>
                <input
                  type="text"
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  placeholder="What did you learn or accomplish?"
                  className="w-full h-10 px-3 rounded-xl bg-card border border-border text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleDiscardSession} className="rounded-xl">
                Discard
              </Button>
              <Button onClick={handleSaveSession} className="bg-primary text-primary-foreground rounded-xl">
                Save & Update Analytics
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
