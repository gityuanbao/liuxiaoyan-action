import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store'
import catalog from './pronunciation-catalog.json'
import { humanClip } from './audio-library-data'
import { Icon } from './Icon'

export type SpokenKind = 'word' | 'sentence' | 'chant'
type Utterance = { text: string; kind: SpokenKind; accepted: boolean }
type Phase = 'ready' | 'loading' | 'playing' | 'finished' | 'stopped' | 'error'
const normalize = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase()
const localClips = new Map(catalog.clips.map(clip => [normalize(clip.text), clip]))
export function pronunciationSource(text: string, kind: SpokenKind) {
  const human = kind === 'word' ? humanClip(normalize(text)) : undefined
  if (human) return { file: human.file, label: `真人发音 · ${human.author}`, seconds: 8 }
  const clip = localClips.get(normalize(text))
  return clip ? { file: clip.file, label: '英语合成朗读', seconds: clip.seconds } : { file: '', label: '系统英语朗读', seconds: 90 }
}

export function usePronunciation(paused: boolean) {
  const soundEnabled = useGameStore(s => s.soundEnabled), volume = useGameStore(s => s.soundVolume), automatic = useGameStore(s => s.pronunciationEnabled)
  const settings = { soundEnabled, volume, automatic }
  const player = useRef<HTMLAudioElement>(null), ticket = useRef(0), timer = useRef<ReturnType<typeof setTimeout>>()
  const speech = useRef<SpeechSynthesisUtterance | null>(null)
  const current = useRef({ ...settings, paused }); current.current = { ...settings, paused }
  const [last, setLast] = useState<Utterance | null>(null), [phase, setPhase] = useState<Phase>('ready')
  const dispose = () => {
    ticket.current++; clearTimeout(timer.current)
    if (player.current) { player.current.pause(); player.current.onended = null; player.current.onerror = null; player.current.onplaying = null }
    if (speech.current) { speech.current.onend = null; speech.current.onerror = null; speech.current.onstart = null; window.speechSynthesis?.cancel(); speech.current = null }
  }
  function stop() { dispose(); setPhase(previous => previous === 'playing' || previous === 'loading' ? 'stopped' : previous) }
  function reset() { dispose(); setLast(null); setPhase('ready') }
  function play(text: string, kind: SpokenKind, automatic = false, accepted = automatic) {
    dispose()
    const phrase = { text: text.trim(), kind, accepted }; setLast(phrase)
    const now = current.current
    if (!phrase.text || now.paused || !now.soundEnabled || now.volume <= 0 || automatic && !now.automatic) { setPhase('ready'); return }
    const id = ticket.current, source = pronunciationSource(phrase.text, kind)
    const update = (next: Phase) => { if (ticket.current === id) { setPhase(next); if (next === 'finished' || next === 'error') clearTimeout(timer.current) } }
    setPhase('loading')
    timer.current = setTimeout(() => { if (ticket.current === id) { dispose(); setPhase('error') } }, Math.max(15000, source.seconds * 1000 + 10000))
    if (source.file && player.current) {
      const audio = player.current
      audio.volume = Math.min(1, Math.max(0, now.volume / 100)); audio.src = source.file; audio.currentTime = 0
      audio.onplaying = () => update('playing'); audio.onended = () => update('finished'); audio.onerror = () => update('error')
      try { void audio.play().catch(() => update('error')) } catch { update('error') }
    } else if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      try {
        const utterance = new SpeechSynthesisUtterance(phrase.text)
        utterance.lang = 'en-US'; utterance.rate = .85; utterance.volume = Math.min(1, Math.max(0, now.volume / 100))
        const voice = window.speechSynthesis.getVoices().find(v => /^en[-_]/i.test(v.lang))
        if (voice) utterance.voice = voice
        speech.current = utterance
        utterance.onstart = () => update('playing'); utterance.onend = () => update('finished'); utterance.onerror = () => update('error')
        window.speechSynthesis.speak(utterance)
      } catch { update('error') }
    } else update('error')
  }
  useEffect(() => { if (paused || !settings.soundEnabled || settings.volume <= 0) stop() }, [paused, settings.soundEnabled, settings.volume])
  useEffect(() => () => dispose(), [])
  return { player, last, phase, play, stop, reset, audible: settings.soundEnabled && settings.volume > 0 }
}

export function PronunciationFeedback({ voice, paused = false }: { voice: ReturnType<typeof usePronunciation>; paused?: boolean }) {
  const { last, phase, audible } = voice
  const source = last && pronunciationSource(last.text, last.kind)
  return <div className={`pronunciation-feedback pronunciation-${phase} ${last ? 'has-phrase' : ''}`}>
    {last && <><div className="pronunciation-copy"><span>{!last.accepted ? '参考发音' : last.kind === 'word' ? '刚刚拼对' : last.kind === 'chant' ? '刚刚完成的大招' : '刚刚写对的句子'}</span><b title={last.text}>{last.text}</b><small title={phase === 'error' ? '未能播放，可重听或检查声音设置' : source?.label}>{source?.label} · {!audible ? '声音已关闭' : phase === 'loading' ? '正在准备发音…' : phase === 'playing' ? '正在朗读' : phase === 'finished' ? '朗读完成' : phase === 'error' ? '未能播放，可重听或检查声音设置' : phase === 'stopped' ? '已停止，可随时重听' : '可重听发音'}</small></div><button type="button" disabled={paused || !audible} title={!audible ? '请在设置中打开音效与朗读并提高音量' : '重听刚刚完成的英文'} onClick={() => voice.play(last.text, last.kind, false, last.accepted)} aria-label={last.accepted ? "重听上次正确答案" : "重听参考发音"}><Icon name="sound" size={16}/>{phase === 'playing' ? '重新听' : '重听上次'}</button></>}
  </div>
}
