import { optimizedArt } from './optimized-art'
import { GrowthPanel } from './GrowthPanel'
import { TACTICS, HERO_GROWTH } from './battle-identity'
import { heroBond } from './growth-core'
import { BattleArt } from './BattleArt'
import { useState } from 'react'
import { useGameStore } from '../store'
import { setAvatar, useLearning } from './learning-store'
import { CHARACTER_SKILLS } from './combat-skills'
import { CHARACTERS, type AvatarId } from './character-data'
export { CHARACTERS, type AvatarId } from './character-data'

export function CharacterArt({ avatar, side, className = '' }: { avatar: AvatarId; side: 'left' | 'right'; className?: string }) {
  const flip = CHARACTERS[avatar].facing !== (side === 'left' ? 'right' : 'left')
  return <img className={`character-art ${className}`} src={CHARACTERS[avatar].image} alt={CHARACTERS[avatar].name} style={{ transform: flip ? 'scaleX(-1)' : undefined }}/>
}

export function AppearancePage() {
  const profile = useLearning()
  const [preview, setPreview] = useState<AvatarId>(profile.avatar ?? 'mage')
  const [notice, setNotice] = useState(''), [action, setAction] = useState(1)
  const setScreen = useGameStore(s => s.setScreen)
  const character = CHARACTERS[preview]
  return <section className="appearance-scene">
    <div className="appearance-copy"><span className="scene-kicker">角色档案 · 六位旅伴</span><h1>选择与你同行的形象</h1><p>每位角色都有专属被动与长句大招。选择你的战斗风格，以准确拼写积攒力量。</p>
      <div className="character-choices">{Object.entries(CHARACTERS).map(([id, c]) => <button key={id} className={preview === id ? 'selected' : ''} onClick={() => { setPreview(id as AvatarId); setNotice('') }}><img src={optimizedArt(`/art/galgame/${id}-avatar.png`)} alt=""/><span><b>{c.name}</b><small>{c.title}{(profile.avatar ?? 'mage') === id && ' · 当前形象'}</small></span></button>)}</div>
      <div className="character-bio"><span>{character.element}</span><h2>{character.name}</h2><div className="character-details"><p>{character.description}</p><blockquote>“{character.greeting}”</blockquote><div className="character-skill"><b>被动 · {CHARACTER_SKILLS[preview].passive}</b><p>{HERO_GROWTH[preview][heroBond(profile, preview).rank - 1]}</p><b>战技 · {TACTICS[preview].name}</b><p>{TACTICS[preview].effect} 三次普通命中后可用，每场一次。</p><b>长句大招 · {CHARACTER_SKILLS[preview].ultimate}</b><p>{CHARACTER_SKILLS[preview].effect}</p></div><GrowthPanel key={preview} kind="hero" id={preview}/></div><div className="character-contract"><button className="gal-button" onClick={() => { try { setAvatar(preview); setNotice('形象已保存。下一场对战将使用这个角色。') } catch { setNotice('形象保存失败，请检查浏览器存储。') } }}>缔结契约 · 使用形象</button><button className="gal-link" onClick={() => setScreen('story')}>去回忆遗迹 · 阅读剧情 →</button><p role="status">{notice}</p></div></div>
    </div><div className="appearance-portrait action-portrait"><BattleArt key={preview} avatar={preview} side="left" event={action} casting/><button className="gal-button ghost action-preview" onClick={() => setAction(n => n + 1)}>预览施法动作</button><span className="portrait-caption">{character.title}</span></div>
  </section>
}
