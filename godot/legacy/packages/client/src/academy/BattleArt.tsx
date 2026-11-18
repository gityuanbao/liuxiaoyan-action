import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from './useReducedMotion'
import { CHARACTERS, type AvatarId } from './character-data'
import { SPIRIT_FORMS } from './battle-identity'
import type { SpiritId } from './combat-skills'

export function BattleArt({ avatar, side, event, casting, paused = false, hurt = false, victory = false }: { avatar: AvatarId; side: 'left' | 'right'; event?: number; casting?: boolean; paused?: boolean; hurt?: boolean; victory?: boolean }) {
  const reduced = useReducedMotion(), [frame, setFrame] = useState<number | null>(null), [readyFor, setReadyFor] = useState('')
  const loaded = useRef(new Map<string, Set<number>>()), handled = useRef(''), currentAvatar = useRef(avatar)
  currentAvatar.current = avatar
  const [hidden, setHidden] = useState(document.hidden)
  const stopped = paused || hidden || reduced, ready = readyFor === avatar
  useEffect(() => { const change = () => setHidden(document.hidden); document.addEventListener('visibilitychange', change); return () => document.removeEventListener('visibilitychange', change) }, [])
  useEffect(() => {
    setFrame(null)
    const key = `${avatar}:${event ?? 0}`
    // Resuming must never replay a suspended attack.
    if (stopped) { handled.current = key; return }
    if (!ready || !casting || !event || handled.current === key) return
    handled.current = key
    setFrame(0)
    const timers = [[1, 100], [2, 260], [3, 500], [0, 730], [null, 930]].map(([pose, at]) => setTimeout(() => setFrame(pose), at!))
    return () => timers.forEach(clearTimeout)
  }, [avatar, event, casting, stopped, ready])
  const flip = CHARACTERS[avatar].facing !== (side === 'left' ? 'right' : 'left')
  const shownFrame = victory && !reduced && !hidden && ready ? 1 : stopped ? null : frame
  const motion = stopped ? 'still' : hurt ? 'hurt' : shownFrame !== null ? 'casting' : 'idle'
  return <span className={`hero-body hero-${avatar} actor-${side} hero-${motion}`} data-pose={shownFrame === null ? 'idle' : shownFrame + 1} data-actor-event={event} data-hd-ready={ready}>
    <span className="hero-body-motion"><img className="character-art battle-body-art hero-idle-art" src={CHARACTERS[avatar].image} alt={CHARACTERS[avatar].name} style={{ transform: flip ? 'scaleX(-1)' : undefined, opacity: shownFrame === null ? 1 : 0 }} decoding="async"/>
      {[0, 1, 2, 3].map(i => <img key={`${avatar}-${i}`} className="hero-cast-art" src={`/art/character-hd-v1/${avatar}/cast-${i + 1}.webp`} alt="" aria-hidden="true" decoding="async" style={{ transform: flip ? 'scaleX(-1)' : undefined, opacity: shownFrame === i ? 1 : 0 }} onLoad={() => { const frames = loaded.current.get(avatar) ?? new Set<number>(); frames.add(i); loaded.current.set(avatar, frames); if (frames.size === 4 && currentAvatar.current === avatar) setReadyFor(avatar) }}/>)}</span>
  </span>
}
export function SpiritArt({ id, rank = 1, name, paused = false }: { id: SpiritId; rank?: number; name: string; paused?: boolean }) {
  const reduced = useReducedMotion(), [frame, setFrame] = useState(0)
  useEffect(() => { setFrame(0); if (paused || reduced) return; const timer = setInterval(() => setFrame(f => 1 - f), 850); return () => clearInterval(timer) }, [id, rank, paused, reduced])
  return <img className="spirit-body-art" src={`/art/growth-v1/${id}/evolution-${(rank >= 3 ? 3 : 1) + frame}.webp`} alt={`${name} · ${rank >= 3 ? SPIRIT_FORMS[id].awakened : SPIRIT_FORMS[id].shape}`}/>
}
