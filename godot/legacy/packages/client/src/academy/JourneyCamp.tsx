import { Icon, PageEmblem } from './Icon'
import { PageTabs } from './JourneyMenu'
import { useState } from 'react'
import { useGameStore } from '../store'
import { useLearning, engraveRune, wearRune, receiveCommission } from './learning-store'
import { COMMISSIONS, activeRune } from './expedition-core'
import { RUNE_IDS, RUNES, RUNE_COSTS } from './expedition-data'
import { GrowthPanel } from './GrowthPanel'
import { CharacterArt, CHARACTERS } from './Appearance'
import { SpiritArt } from './BattleArt'
import { spiritBond } from './growth-core'
import { SPIRITS } from './words'
import type { SpiritId } from './combat-skills'

export function Commissions() {
  const profile = useLearning(), [notice, setNotice] = useState(''), setScreen = useGameStore(s => s.setScreen)
  return <section className="journey-commissions" aria-label="旅途委托"><header><div><h2><Icon name="letter" size={27}/>旅途来信</h2><p>没有过期时间。走过的路，都会成为回信。</p></div><button className="gal-link" onClick={() => setScreen('exam')}>学术四域 · 听读写说</button></header><div>{COMMISSIONS.map(c => { const n = Math.min(c.target, c.progress(profile)), claimed = profile.expedition?.claims.includes(c.id); return <article key={c.id}><span><Icon name={claimed ? 'check' : 'letter'} size={32}/></span><div><h3>{c.name}</h3><p>{c.detail}</p><small>{n}/{c.target} · 星砂 +{c.reward}</small></div><button disabled={claimed || n < c.target} onClick={() => { try { receiveCommission(c.id); setNotice(`${c.name}：${c.reward} 星砂已入账。`) } catch (e) { setNotice(e instanceof Error ? e.message : '保存失败，请重试。') } }}>{claimed ? '已回信' : n < c.target ? '旅途中' : '领取谢礼'}</button></article> })}</div>{notice && <p role="status">{notice}</p>}</section>
}
export function JourneyCamp() {
  const [view, setView] = useState<'party' | 'runes' | 'letters'>('party')
  const profile = useLearning(), [notice, setNotice] = useState(''), setScreen = useGameStore(s => s.setScreen)
  const avatar = profile.avatar ?? 'mage', spirit = profile.companion as SpiritId, rune = activeRune(profile)
  function act(fn: () => void, message: string) { try { fn(); setNotice(message) } catch (e) { setNotice(e instanceof Error ? e.message : '未能保存，请重试。') } }
  return <section className="journey-camp"><header className="route-heading"><PageEmblem name="camp"/><div><span>旅人营火</span><h1>为下一次相遇，做好准备</h1><p>契约强化旅伴的专长，星纹决定这一场的打法。选择会在下次出战时生效。</p></div><button className="gal-button" onClick={() => setScreen('expedition')}><Icon name="expedition" size={22}/>整装出发 · 星灯远征</button></header>
    <PageTabs value={view} onChange={setView} label="营火册页" items={[['party', '旅伴契约'], ['runes', '星纹刻印'], ['letters', '旅途来信']]}/>
    <div className="camp-content folio-scroll">{view === 'party' && <div className="camp-party"><article className="camp-bond"><div className="camp-portrait"><CharacterArt avatar={avatar} side="left"/></div><div><h2>{CHARACTERS[avatar].name}</h2><button className="gal-link" onClick={() => setScreen('appearance')}><Icon name="hero" size={21}/>更换角色与查看战技</button><GrowthPanel kind="hero" id={avatar}/></div></article><article className="camp-bond"><div className="camp-portrait spirit"><SpiritArt id={spirit} rank={spiritBond(profile, spirit).rank} name={SPIRITS.find(s => s.id === spirit)?.name ?? '同行精灵'} paused/></div><div><h2>{SPIRITS.find(s => s.id === spirit)?.name}</h2><button className="gal-link" onClick={() => setScreen('spirits')}><Icon name="spirit" size={22}/>选择精灵与形态</button><GrowthPanel kind="spirit" id={spirit}/></div></article></div>
    }{view === 'runes' && <section className="rune-forge" aria-label="星纹培养"><header><div><h2><Icon name="insight" size={30}/>星纹刻印</h2><p>只装备一枚，可以免费切换；升阶后保留其他星纹。</p></div><b><Icon name="coins" size={22}/>星砂 {profile.growth?.coins ?? 0}</b></header><div className="rune-choices">{RUNE_IDS.map(id => { const r = RUNES[id], rank = profile.expedition?.runes[id] ?? 0, equipped = rune?.id === id, cost = RUNE_COSTS[rank]; return <article key={id} className={equipped ? 'equipped' : ''} style={{ '--rune-color': r.color } as React.CSSProperties}><span className="rune-glyph" aria-hidden="true"><Icon name={id} size={60}/></span><h3>{r.name}</h3><div className="rune-level" aria-label={`${rank}级，共3级`}>{[1, 2, 3].map(n => <i className={n <= rank ? 'lit' : ''} key={n}><Icon name="star" size={16}/></i>)}</div><p>{r.description}</p><small>{rank ? `${rank}级${equipped ? ' · 当前装备' : ' · 已刻印'}` : '完成首场远征后可刻印'}</small><button className="gal-button" disabled={rank >= 3 || (profile.growth?.coins ?? 0) < cost || !Object.keys(profile.expedition?.clears ?? {}).length} onClick={() => act(() => engraveRune(id), `${r.name}已提升并装备。下一场战斗生效。`)}>{rank >= 3 ? '星纹已圆满' : `${rank ? '升级' : '刻印'} · ${cost} 星砂`}</button><button className="gal-button ghost" disabled={!rank || equipped} onClick={() => act(() => wearRune(id), `已装备${r.name}。`)}>{equipped ? '正在装备' : '装备这枚星纹'}</button></article> })}</div>{rune && <button className="gal-link" onClick={() => act(() => wearRune(), '已卸下星纹，下一场不使用星纹加成。')}>卸下星纹</button>}{notice && <p role="status">{notice}</p>}</section>}{view === 'letters' && <Commissions/>}</div>
  </section>
}
