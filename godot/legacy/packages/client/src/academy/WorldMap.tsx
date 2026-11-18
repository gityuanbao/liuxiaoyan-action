import { DialogueFrame } from './DialogueFrame'
import { useGameStore } from '../store'
import { useLearning } from './learning-store'
import { CharacterArt, CHARACTERS } from './Appearance'
import { WORLD_REGIONS } from './world-data'
import { journeyObjective } from './adventure-guidance'
import { DailyGoal } from './DailyGoal'
import { Icon } from './Icon'
import { JourneyMenu } from './JourneyMenu'
import { Landmark, ArcaneSigil } from './ArcaneArt'

export function WorldMap({ onExplore }: { onExplore: (pack: string) => void }) {
  const setScreen = useGameStore(s => s.setScreen)
  const profile = useLearning()
  const avatar = profile.avatar ?? 'mage'
  const character = CHARACTERS[avatar]
  const objective = journeyObjective(profile)
  const destination = WORLD_REGIONS.find(r => r.screen === objective.screen)?.id
  return <section className="world-map-scene" aria-label="星语群岛冒险地图">
    <img className="world-map-art" src="/art/optimized-v1/world-map-d18854ad666b.webp" alt="星语群岛：森林、星塔、学院、海港与旅人营地"/><div className="world-map-vignette"/><div className="atlas-ornament" aria-hidden="true"/><ArcaneSigil className="map-astrolabe"/>
    <div className="world-heading"><span className="scene-kicker">星灯航路</span><h1>星语群岛</h1><p>循着星灯，前往下一段冒险。</p><DailyGoal/></div>
    <div className="world-regions">{WORLD_REGIONS.map(r => <button key={r.id} className={`world-region region-${r.id} ${r.id === destination ? 'is-current-route' : ''}`} style={{ left: `${r.x}%`, top: `${r.y}%`, '--region-color': r.color } as React.CSSProperties} title={r.description} onClick={() => r.screen === 'vocabulary' ? onExplore('environment') : setScreen(r.screen)} aria-label={`${r.name} · ${r.screen === 'vocabulary' ? '词汇战斗' : r.screen === 'sentence' ? '句子战斗' : r.screen === 'listening' ? '听力战斗' : r.screen === 'atlas' ? '雅思阅读' : r.screen === 'exam' ? '雅思四域试炼' : r.screen === 'story' ? '故事剧情' : r.screen === 'appearance' ? '角色选择' : r.screen === 'spirits' ? '精灵图鉴' : '学习档案'}`}>{r.id === destination && <span className="current-route-marker">当前主线</span>}<span className="map-pin"><Landmark id={r.id}/></span><b>{r.name}</b><small>{r.screen === 'vocabulary' ? '词汇决斗' : r.screen === 'sentence' ? '句子咒语' : r.screen === 'listening' ? '听力试炼' : r.screen === 'atlas' ? '雅思阅读' : r.screen === 'exam' ? '四域试炼' : r.screen === 'story' ? '故事章节' : r.screen === 'appearance' ? '角色契约' : r.screen === 'spirits' ? '精灵图鉴' : '成长手记'}</small></button>)}</div>
    <JourneyMenu/>
    <div className="world-companion" aria-hidden="true"><CharacterArt avatar={avatar} side="right"/></div>
    <DialogueFrame className="world-dialogue journey-dialogue" avatar={avatar} name={character.name} role="与你同行的旅伴"><div><span className="journey-phase">{objective.phase}</span><h2>{objective.title}</h2><p>{objective.detail}</p></div><button className="gal-button ghost" onClick={() => objective.screen === 'vocabulary' ? onExplore('environment') : setScreen(objective.screen)}>{objective.action} <Icon name="arrow" size={16}/></button></DialogueFrame>
  </section>
}

