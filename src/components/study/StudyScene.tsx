import { Sparkles } from 'lucide-react'

export type BuddyId = 'cat' | 'panda' | 'dog' | 'fox' | 'dolphin' | 'parrot' | 'penguin' | 'owl'
export const buddies: { id: BuddyId; name: string; emoji: string; accent: string; scene: string }[] = [
  { id:'cat', name:'Mochi', emoji:'🐈', accent:'#f59e0b', scene:'Golden hour study nook' },
  { id:'panda', name:'Bamboo', emoji:'🐼', accent:'#22c55e', scene:'Misty bamboo garden' },
  { id:'dog', name:'Sunny', emoji:'🐕', accent:'#38bdf8', scene:'Sunny garden desk' },
  { id:'fox', name:'Ember', emoji:'🦊', accent:'#f97316', scene:'Rainforest log nook' },
  { id:'dolphin', name:'Ripple', emoji:'🐬', accent:'#06b6d4', scene:'Golden ocean horizon' },
  { id:'parrot', name:'Rio', emoji:'🦜', accent:'#14b8a6', scene:'Canopy reading branch' },
  { id:'penguin', name:'Pebble', emoji:'🐧', accent:'#60a5fa', scene:'Aurora ice shelf' },
  { id:'owl', name:'Lumen', emoji:'🦉', accent:'#a78bfa', scene:'Moonlit forest library' },
]

export function StudyScene({ buddy, state }: { buddy: BuddyId; state: 'idle' | 'focus' | 'break' | 'warning' }) {
  const selected = buddies.find(item => item.id === buddy) || buddies[0]
  return <div className={`study-scene scene-${buddy} scene-${state}`}><div className="scene-sky"/><div className="scene-glow"/><div className="scene-silhouette"/><div className="scene-desk"><span className="scene-book">▱</span><span className="scene-lamp">◐</span></div><div className="scene-buddy" aria-label={`${selected.name}, your ${selected.id} study buddy`}>{selected.emoji}</div><div className="scene-sparkles"><Sparkles size={14}/><span>✦</span><span>✧</span></div><div className="scene-caption"><span>{selected.scene}</span><strong>{selected.name} is {state === 'focus' ? 'studying with you' : state === 'break' ? 'taking a little break' : 'ready when you are'}</strong></div></div>
}
