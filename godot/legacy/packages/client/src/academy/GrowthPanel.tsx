import { Icon } from './Icon'
import type { AvatarId } from './character-data'
import type { SpiritId } from './combat-skills'
import { HERO_GROWTH, spiritEffect } from './battle-identity'
import { heroBond, spiritBond, nextUpgrade, RANK_NAMES } from './growth-core'
import { strengthenCompanion, useLearning } from './learning-store'
import { useState } from 'react'
export function GrowthPanel({ kind, id }: { kind: 'hero' | 'spirit'; id: AvatarId | SpiritId }) {
  const profile = useLearning(), [notice, setNotice] = useState('')
  const bond = kind === 'hero' ? heroBond(profile, id as AvatarId) : spiritBond(profile, id as SpiritId)
  const next = nextUpgrade(kind, bond.rank), coins = profile.growth?.coins ?? 0
  const effect = (rank: number) => kind === 'hero' ? HERO_GROWTH[id as AvatarId][rank - 1] : spiritEffect(id as SpiritId, rank)
  return <section className="bond-panel" aria-label={kind === 'hero' ? '角色成长' : '星灵成长'}>
    <div className="bond-heading"><h3><Icon name={kind === 'hero' ? 'hero' : 'spirit'} size={24}/>{RANK_NAMES[bond.rank - 1]} <small>{bond.rank}阶 / 3阶</small></h3><span><Icon name="coins" size={19}/>星砂 {coins}</span></div>
    <p className="bond-current">{effect(bond.rank)}</p>
    <label>同行熟练度 <b>{bond.xp}{next ? ` / ${next.xp}` : ''}</b><progress aria-label="同行熟练度" value={Math.min(bond.xp, next?.xp ?? Math.max(1, bond.xp))} max={next?.xp ?? Math.max(1, bond.xp)}/></label>
    {next ? <><p>下一阶：{effect(bond.rank + 1)}{kind === 'spirit' && bond.rank === 2 ? '；解锁觉醒形态' : ''}</p><button className="gal-button ghost" disabled={coins < next.cost || bond.xp < next.xp} onClick={() => { try { strengthenCompanion(kind, id); setNotice('契约已进阶。新的专长将在下一场战斗生效。') } catch (error) { setNotice(error instanceof Error ? error.message : '进阶未保存，请重试。') } }}>消耗 {next.cost} 星砂 · {kind === 'hero' ? '强化专长' : '唤醒星灵'}</button><small>{bond.xp < next.xp ? `还需 ${next.xp - bond.xp} 熟练度，带上这位伙伴完成练习。` : coins < next.cost ? `还需 ${next.cost - coins} 星砂，完成练习可获得。` : '条件已满足，可以进阶。'}</small></> : <p className="bond-complete"><Icon name="check" size={21}/>契约已觉醒，带着这份力量继续旅途。</p>}
    {notice && <p role="status">{notice}</p>}
  </section>
}
