import { useState } from 'react'
import { useGameStore } from '../store'
import { WORLD_LORE } from './world-lore'
import { useLearning } from './learning-store'
import { earnedSeals } from './trial-core'
import { Icon, PageEmblem } from './Icon'
export function WorldLorePage() {
  const setScreen = useGameStore(s => s.setScreen), profile = useLearning(), [selected, setSelected] = useState(0)
  const entry = WORLD_LORE[selected]
  return <section className="lore-page">
    <header className="folio-heading"><PageEmblem name="world"/><div><span className="scene-kicker">星语群岛的记忆</span><h1>世界档案</h1><p>当文字失去意义，谁来重新点亮星灯？</p></div><button className="gal-button" onClick={() => setScreen('story')}><Icon name="letter" size={21}/>翻开主线剧情</button></header>
    <div className="lore-reader"><nav className="lore-index" aria-label="世界档案章节">{WORLD_LORE.map((item, i) => <button key={item.title} aria-pressed={selected === i} className={selected === i ? 'selected' : ''} onClick={() => setSelected(i)}><span><Icon name={['world','ghost','exam','notebook','hero','letter'][i]} size={28}/></span><b>{item.title}</b><small>{item.tag.split(' · ')[0]}</small></button>)}</nav>
      <article className="lore-entry" key={selected}><img src={`/art/story-v2/${['prologue', 'archive', 'harbor', 'archive', 'courtyard', 'prologue'][selected]}.webp`} alt=""/><div className="lore-entry-copy"><Icon name={['world','ghost','exam','notebook','hero','letter'][selected]} size={80}/><span>{entry.tag}</span><h2>{entry.title}</h2><p>{entry.text}</p><blockquote>你是在倾听、查证与表达中，逐渐找到自己声音的旅人。</blockquote><div className="button-row"><button className="gal-button ghost" disabled={selected === 0} onClick={() => setSelected(selected - 1)}><Icon name="back" size={18}/>上一页</button><button className="gal-button ghost" disabled={selected === WORLD_LORE.length - 1} onClick={() => setSelected(selected + 1)}>下一页<Icon name="arrow" size={18}/></button><button className="gal-link" onClick={() => setScreen('exam')}><Icon name="exam" size={22}/>前往四域试炼</button></div></div></article>
    </div><footer className="lore-progress"><b>已找回 {profile.story?.completed.length ?? 0} 章记忆</b><span>已修复 {earnedSeals(profile.trials).size} / 4 枚印记</span><small>来自你的旅途存档</small></footer>
  </section>
}
