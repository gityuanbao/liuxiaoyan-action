import { useEffect, useState } from 'react'
import { SPIRITS } from './words'
import { profileStats } from './learning-core'
import { setCompanion, useLearning } from './learning-store'
import type { SpiritId } from './combat-skills'
import { SPIRIT_FORMS, spiritEffect } from './battle-identity'
import { spiritBond } from './growth-core'
import { GrowthPanel } from './GrowthPanel'
import { SpiritArt } from './BattleArt'
export function SpiritSanctuary() {
  const profile = useLearning(), stats = profileStats(profile)
  const [selected, setSelected] = useState<SpiritId>(profile.companion as SpiritId), [awakened, setAwakened] = useState(false), [notice, setNotice] = useState('')
  const spirit = SPIRITS.find(s => s.id === selected) ?? SPIRITS[0], bond = spiritBond(profile, selected), unlocked = stats.battles >= spirit.threshold
  useEffect(() => { setAwakened(bond.rank >= 3) }, [bond.rank, selected])
  return <section className="spirit-sanctuary"><div className="sanctuary-roster"><h1>星灵花园</h1><p>每一次同行，都让契约生长。</p><div className="spirit-roster">{SPIRITS.map(s => <button key={s.id} className={`${selected === s.id ? 'selected' : ''} ${stats.battles < s.threshold ? 'undiscovered' : ''}`} onClick={() => { setSelected(s.id as SpiritId); setAwakened(spiritBond(profile, s.id as SpiritId).rank >= 3); setNotice('') }}><img src={`/art/growth-v1/${s.id}/evolution-1.webp`} alt=""/><span><b>{s.name}</b><small>{SPIRIT_FORMS[s.id as SpiritId].shape}{profile.companion === s.id ? ' · 当前伙伴' : stats.battles < s.threshold ? ' · 尚未结伴' : ''}</small></span></button>)}</div><p className="garden-rule">完成练习获得星砂与同行熟练度。先提升契约，再唤醒新的形态。</p></div>
    <div className="spirit-display" style={{ '--spirit-color': spirit.color } as React.CSSProperties}><div className={`spirit-showcase ${!unlocked ? 'undiscovered' : ''}`}><SpiritArt id={selected} rank={awakened ? 3 : 1} name={spirit.name}/></div><div className="form-switch"><button className={!awakened ? 'selected' : ''} onClick={() => setAwakened(false)}>幼年形态</button><button className={awakened ? 'selected' : ''} onClick={() => setAwakened(true)}>觉醒形态</button></div><small>{awakened && bond.rank < 3 ? '觉醒预览 · 三阶进阶后在战斗中生效' : bond.rank >= 3 ? '已觉醒 · 出战使用觉醒形态' : '当前出战形态'}</small></div>
    <div className="spirit-dossier"><span className="spirit-nature">{spirit.title}</span><h2>{spirit.name}</h2><p>{spirit.description}</p><p className="spirit-effect">{spiritEffect(selected, bond.rank)}</p><small>{spirit.requirement}{!unlocked ? ` · 当前 ${stats.battles} 场` : ''}</small><button className="gal-button" disabled={!unlocked || profile.companion === selected} onClick={() => { try { setCompanion(selected); setNotice(`${spirit.name}已与你结伴。`) } catch (error) { setNotice(error instanceof Error ? error.message : '结伴未保存。') } }}>{profile.companion === selected ? '正在与你同行' : unlocked ? '设为冒险伙伴' : '继续冒险，等待相遇'}</button>{notice && <p role="status">{notice}</p>}{unlocked && <GrowthPanel key={selected} kind="spirit" id={selected}/>}<small className="currency-rule">星砂只在新成绩保存后结算。跟打可以练习；独立回忆另有奖励。</small></div>
  </section>
}
