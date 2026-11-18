import { Icon, PageEmblem } from './Icon'
import { PageTabs } from './JourneyMenu'
import { useState } from 'react'
import { useGameStore } from '../store'
import { useLearning } from './learning-store'
import { EXPEDITION, RUNES } from './expedition-data'
import { activeRune, stageUnlocked } from './expedition-core'
import { MONSTERS } from './monster-data'
import { CHARACTERS, CharacterArt } from './Appearance'
import { SpiritArt } from './BattleArt'
import { spiritBond } from './growth-core'
import type { SpiritId } from './combat-skills'
import { VocabularyBattle } from './VocabularyBattle'
import { createDuel, enemyIntent } from './duel-engine'
import { Commissions } from './JourneyCamp'

export function ExpeditionPage() {
  const profile = useLearning(), setScreen = useGameStore(s => s.setScreen)
  const nextIndex = EXPEDITION.findIndex(s => !profile.expedition?.clears[s.id])
  const [view, setView] = useState<'route' | 'letters'>('route')
  const [selected, setSelected] = useState(nextIndex < 0 ? 11 : nextIndex), [playing, setPlaying] = useState(false), [after, setAfter] = useState('')
  const stage = EXPEDITION[selected], cleared = profile.expedition?.clears[stage.id], unlocked = stageUnlocked(profile, stage.id)
  const count = EXPEDITION.filter(s => profile.expedition?.clears[s.id]).length, stars = Object.values(profile.expedition?.clears ?? {}).reduce((n, c) => n + c.stars, 0)
  const avatar = profile.avatar ?? 'mage', rune = activeRune(profile), spirit = profile.companion as SpiritId
  if (playing) return <VocabularyBattle key={stage.id} initialPack={stage.pack} lesson={stage.lesson} expedition={stage} onExpeditionReturn={record => { setPlaying(false); if (record?.outcome === 'victory') setAfter(stage.after) }}/>
  return <section className="expedition-page">
    <header className="route-heading"><PageEmblem name="expedition"/><div><span>星灯远征</span><h1>{count === 12 ? '航路已亮，故事仍在继续' : '把失去的名字，送回群岛'}</h1><p>{count === 12 ? '十二次遭遇连成了回家的路。你可以挑战更高星级，或前往四域，练习听读写说。' : '从一个短词开始。沿着四段航路，与旅伴一起点亮最后的星灯。'}</p></div><div className="route-total"><b>{count}<small>/12</small></b><span>已点亮航标</span><em><Icon name="star" size={18}/>{stars} / 36</em></div></header>
    <PageTabs value={view} onChange={setView} label="远征册页" items={[['route', '远征航路'], ['letters', '旅途来信']]}/>
    {view === 'route' && after && <article className="route-after" role="status"><span>战后 · {stage.region}</span><p>{after}</p><div className="button-row">{selected < 11 && <button className="gal-button" onClick={() => { setSelected(selected + 1); setAfter('') }}>前往下一处航标</button>}<button className="gal-button ghost" onClick={() => setScreen('camp')}>回营 · 培养与星纹</button>{count === 12 && <button className="gal-button" onClick={() => setScreen('exam')}>新的远方 · 四域试炼</button>}</div></article>}
    {view === 'route' ? <div className="expedition-layout"><div className="route-chart" aria-label="十二关远征航路">{['月光桥', '风之森林', '回声海港', '星文高塔'].map((region, r) => <section className={`route-region route-region-${r}`} key={region}><header><span><Icon name={['moonbridge', 'forest', 'harbor', 'tower'][r]} size={38}/></span><div><h2>{region}</h2><small>{['基础拼写 · 认识连击', '主题词汇 · 独立回忆', '真人听写 · 及时施法', '句子咏唱 · 解除封印'][r]}</small></div></header><div className="route-nodes">{EXPEDITION.slice(r * 3, r * 3 + 3).map((s, i) => { const index = r * 3 + i, c = profile.expedition?.clears[s.id], open = stageUnlocked(profile, s.id); return <button key={s.id} className={`${selected === index ? 'selected' : ''} ${c ? 'cleared' : ''} ${!open ? 'locked' : ''} ${s.boss ? 'is-boss' : ''}`} aria-pressed={selected === index} aria-label={`${s.name} · ${c ? `${c.stars}星` : open ? '可挑战' : '尚未解锁'}`} onClick={() => { setSelected(index); setAfter('') }}><span className="route-node-art"><img src={MONSTERS[s.monster].image} alt=""/>{s.boss && <i>首领</i>}</span><b>{s.name}</b><small>{c ? <span className="route-star-icons" aria-label={`${c.stars}星，共3星`}>{[1,2,3].map(n => <Icon key={n} name="star" size={15} className={n <= c.stars ? 'lit' : 'unlit'}/>)}</span> : <><Icon name={open ? 'compass' : 'lock'} size={15}/>{open ? '前往此处' : '前路未亮'}</>}</small></button> })}</div></section>)}</div>
      <aside className="route-brief"><div className="route-brief-scene"><CharacterArt avatar={avatar} side="left"/><SpiritArt id={spirit} rank={spiritBond(profile, spirit).rank} name="当前同行精灵" paused/></div><div className="route-brief-copy"><div className="route-brief-text"><span>{stage.region}{stage.boss ? ' · 首领遭遇' : ' · 遭遇'}</span><h2>{stage.name}</h2><p className="route-story">{stage.before}</p><div className="route-enemy"><img src={MONSTERS[stage.monster].image} alt=""/><div><b>{MONSTERS[stage.monster].name} · {stage.hp} 生命</b><p>{enemyIntent(createDuel(stage.difficulty, avatar, spirit, 1, 1, false, { monster: stage.monster })).counter}</p></div></div><p className="route-reward"><Icon name="coins" size={19}/>{cleared ? `最佳 ${cleared.stars} 星 · 首通奖励已领取` : `首通星砂 +${stage.reward}，另有本场练习奖励`}</p><p className="route-loadout"><Icon name="hero" size={18}/>{CHARACTERS[avatar].title} · {rune ? `${RUNES[rune.id].name} ${rune.rank}级` : '未装备星纹'}</p></div><div className="route-brief-actions"><button className="gal-button" disabled={!unlocked} onClick={() => { setAfter(''); setPlaying(true) }}>{!unlocked ? '先点亮前一个航标' : cleared ? '再次挑战 · 提升星级' : '出发 · 进入遭遇'}</button><button className="gal-button ghost" onClick={() => setScreen('camp')}><Icon name="camp" size={20}/>调整搭配与培养</button><small>每场恢复生命；失败不扣星砂。星级由准确率与剩余生命决定。</small></div></div></aside>
    </div> : <div className="folio-scroll"><Commissions/></div>}
  </section>
}
