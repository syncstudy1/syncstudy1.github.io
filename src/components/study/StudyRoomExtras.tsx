import * as React from "react"
import { Headphones, Volume2, VolumeX, Pause, Play } from "lucide-react"
import { SparkleIcon } from "@/components/brand/SparkleIcon"

const buddies = [
  { name: "Cat", emoji: "🐈", tone: "cat" },
  { name: "Panda", emoji: "🐼", tone: "panda" },
  { name: "Dog", emoji: "🐕", tone: "dog" },
  { name: "Fox", emoji: "🦊", tone: "fox" },
  { name: "Dolphin", emoji: "🐬", tone: "dolphin" },
  { name: "Parrot", emoji: "🦜", tone: "parrot" },
  { name: "Penguin", emoji: "🐧", tone: "penguin" },
  { name: "Owl", emoji: "🦉", tone: "owl" },
]
const ambient = ["Lo-fi Study", "Rain", "Cafe", "Forest", "Ocean"]

export function StudyRoomExtras() {
  const [buddy, setBuddy] = React.useState("Cat")
  const [sound, setSound] = React.useState("Lo-fi Study")
  const [playing, setPlaying] = React.useState(false)
  const [volume, setVolume] = React.useState(70)
  const audioRef = React.useRef<AudioContext | null>(null)
  const noiseRef = React.useRef<AudioBufferSourceNode | null>(null)

  React.useEffect(() => {
    try { setBuddy(localStorage.getItem("syncstudy-buddy") || "Cat"); setSound(localStorage.getItem("syncstudy-ambient") || "Lo-fi Study"); setVolume(Number(localStorage.getItem("syncstudy-volume") || 70)) } catch { }
  }, [])
  const chooseBuddy = (name: string) => { setBuddy(name); try { localStorage.setItem("syncstudy-buddy", name) } catch { } }
  const chooseSound = (name: string) => { setSound(name); setPlaying(true); try { localStorage.setItem("syncstudy-ambient", name) } catch { } }
  const toggleAudio = () => {
    if (playing) { noiseRef.current?.stop(); noiseRef.current = null; setPlaying(false); return }
    const context = audioRef.current || new AudioContext()
    audioRef.current = context
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * 0.04
    const source = context.createBufferSource()
    const gain = context.createGain()
    gain.gain.value = volume / 1000
    source.buffer = buffer; source.loop = true; source.connect(gain); gain.connect(context.destination); source.start()
    noiseRef.current = source; setPlaying(true)
  }
  React.useEffect(() => () => { noiseRef.current?.stop(); audioRef.current?.close() }, [])

  return <div className="study-extras-grid">
    <section className="glass-panel study-extra-card"><div className="study-extra-heading"><div><p className="section-kicker">Choose your buddy</p><h2>A little company helps</h2><p>A study buddy keeps you motivated.</p></div><SparkleIcon size={20} /></div><div className="buddy-grid">{buddies.map((item) => <button key={item.name} type="button" onClick={() => chooseBuddy(item.name)} className={`buddy-tile buddy-${item.tone} ${buddy === item.name ? "buddy-selected" : ""}`} aria-pressed={buddy === item.name}><span>{item.emoji}</span><small>{item.name}</small></button>)}</div></section>
    <section className="glass-panel study-extra-card"><div className="study-extra-heading"><div><p className="section-kicker">Ambient mode</p><h2>{sound}</h2><p>Settle into a gentle study atmosphere.</p></div><Headphones className="h-5 w-5 text-violet-500" /></div><div className="ambient-chips">{ambient.map((item) => <button key={item} type="button" onClick={() => chooseSound(item)} className={sound === item ? "ambient-chip ambient-chip-active" : "ambient-chip"}>{item}</button>)}</div><div className="ambient-controls"><button type="button" className="ambient-play" onClick={toggleAudio} aria-label={playing ? "Pause ambient audio" : "Play ambient audio"}>{playing ? <Pause /> : <Play />}</button><div className="flex-1"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{playing ? "Playing softly" : "Ready when you are"}</span><span>{volume}%</span></div><input aria-label="Ambient volume" type="range" min="0" max="100" value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); try { localStorage.setItem("syncstudy-volume", String(next)) } catch { } }} /></div>{volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</div></section>
  </div>
}
