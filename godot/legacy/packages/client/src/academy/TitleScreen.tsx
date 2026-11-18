import { EXPEDITION } from './expedition-data'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useGameStore } from '../store'
import { useLearning } from './learning-store'
import { profileStats } from './learning-core'
import { defaultLearningGoals } from './learning-goals'
import { CHARACTERS } from './character-data'
import { DailyGoal } from './DailyGoal'
import { beginJourney, hasJourney, journeyPage, loadJourneySlot, readSaveBook, saveJourneySlot, verifyActiveJourney, type JourneySave, type SaveBook } from './journey-saves'
import { STORY_CHAPTERS, resumeStoryIndex } from './story-data'
import { ArrivalArt } from './ArrivalArt'

export function JourneyDialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null), closeRef = useRef(close); closeRef.current = close
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    box.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
      if (e.key !== 'Tab') return
      const items = Array.from(box.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,textarea') ?? []), first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); previous?.focus() }
  }, [])
  return <div className="journey-veil" onClick={close}><div className="journey-dialog" role="dialog" aria-modal="true" aria-label={title} ref={box} onClick={e => e.stopPropagation()}><header><h2>{title}</h2><button aria-label={`关闭${title}`} onClick={close}>×</button></header>{children}</div></div>
}
function SaveSummary({ entry }: { entry: JourneySave }) {
  return <><b>{CHARACTERS[entry.profile.avatar ?? 'mage'].name}</b><span>Lv.{profileStats(entry.profile).level}　远征 {Object.keys(entry.profile.expedition?.clears ?? {}).length}/12　故事 {entry.profile.story?.completed.length ?? 0} 章　星砂 {entry.profile.growth?.coins ?? 0}</span><small>{new Date(entry.date).toLocaleString('zh-CN')}</small></>
}
export function TitleScreen() {
  const profile = useLearning(), { setScreen, setSettingsOpen } = useGameStore(), stats = profileStats(profile)
  const [panel, setPanel] = useState<'saves' | 'goals' | 'new' | null>(null), [book, setBook] = useState<SaveBook | null>(null), [notice, setNotice] = useState('')
  const [pending, setPending] = useState<{ mode: 'save' | 'load'; index: number | 'departure' } | null>(null)
  const [sceneState, setSceneState] = useState('loading'), [heroState, setHeroState] = useState('loading')
  const chapter = STORY_CHAPTERS[resumeStoryIndex(profile)], hero = CHARACTERS[profile.avatar ?? 'mage']
  const active = hasJourney()
  const resumePage = journeyPage(), routeCount = Object.keys(profile.expedition?.clears ?? {}).length
  const resumeLabel = resumePage === 'camp' ? '旅人营火 · 培养与搭配' : resumePage === 'expedition' ? routeCount === 12 ? '航路已完成 · 重访群岛' : EXPEDITION.find(s => !profile.expedition?.clears[s.id])?.name ?? '星灯远征' : chapter.title
  function refresh() { try { setBook(readSaveBook()) } catch (err) { setNotice(err instanceof Error ? err.message : '无法读取存档，请检查浏览器存储。'); setBook(null) } }
  function act(operation: () => void) { try { operation() } catch (err) { setNotice(err instanceof Error ? err.message : '未能保存，请检查浏览器存储空间。') } }
  function load(index: number | 'departure') { act(() => { setScreen(loadJourneySlot(index, profile)) }) }
  function save(index: number) { act(() => { saveJourneySlot(index, profile); setPending(null); refresh(); setNotice(`旅途已写入存档 ${index + 1}。`) }) }
  return <main className="title-screen">
    <ArrivalArt className="title-scenery" src="/art/story-v2/prologue.webp" priority onState={setSceneState}/><div className="title-vignette"/>
    <ArrivalArt key={hero.image} className="title-cast" src={hero.image} onState={setHeroState}/>
    <section className="title-menu-area"><div className="title-crest" aria-hidden="true">✧</div><h1>星语群岛</h1><p className="title-subtitle">星光与文字的契约</p><p className="title-storyline">雾海那一端，还有未说完的故事。</p>
      <nav className="title-menu" aria-label="游戏主菜单">
        <button className="title-primary" disabled={!active} onClick={() => act(() => { verifyActiveJourney(); setScreen(journeyPage()) })}><span aria-hidden="true">✦</span>继续旅途<small>{active ? resumeLabel : '等待第一位旅人'}</small></button>
        <button onClick={() => { setNotice(''); setPanel('new') }}>新的旅途</button>
        <button onClick={() => setScreen('expedition')}>星灯远征<small>十二道航标 · 从基础单词开始</small></button>
        <button onClick={() => { setNotice(''); setPending(null); refresh(); setPanel('saves') }}>旅途存档</button>
        <button onClick={() => { setNotice(''); setPanel('goals') }}>学习目标</button>
        <button onClick={() => setScreen('audio-library')}>声音图书馆</button>
        <button onClick={() => setSettingsOpen(true)}>系统设置</button>
      </nav>
    </section>
    <aside className="title-current"><span>{active ? '此刻与你同行' : '等待契约的守望者'}</span><h2>{hero.name}</h2><p>{active ? `Lv.${stats.level}　远征 ${routeCount}/12　故事 ${profile.story?.completed.length ?? 0} 章` : '拼出咒语，唤醒星灯。'}</p><p>学术类 IELTS 目标 {(profile.learningGoals ?? defaultLearningGoals()).band} 分　每日 {profile.goal} 词</p></aside>
    <footer className="title-footer"><span>单人冒险 · 浏览器存档</span><span className="arrival-status" role="status">{sceneState === 'loading' || heroState === 'loading' ? '星灯正在点亮场景 · 可以先选择旅途' : sceneState === 'error' || heroState === 'error' ? '画面未能载入，可点击重试 · 旅途仍可继续' : '进度自动保存 · 重要旅途可在存档中导出备份'}</span></footer>
    {notice && !panel && <p className="title-notice" role="status">{notice}</p>}
    {panel === 'goals' && <JourneyDialog title="学习目标" close={() => setPanel(null)}><p className="journey-intro">从你现在的水平出发，自己决定每天的步幅和想抵达的方向。目标随旅途存档保存。</p><DailyGoal detailed/><button className="gal-button ghost" onClick={() => setScreen('study')}>查看学习档案与备份</button></JourneyDialog>}
    {panel === 'new' && <JourneyDialog title="新的旅途" close={() => setPanel(null)}><p className="journey-intro">从月光桥上的相遇开始。角色、精灵与剧情重新成长，学习目标沿用你的选择。</p>{active && <p>当前旅途会先留在“上次离开的旅途”，三个手动存档保持原样。若还想长期保留，建议先写入手动存档。</p>}<div className="journey-actions"><button className="gal-button" onClick={() => act(() => setScreen(beginJourney(profile)))}>启程 · 进入序章</button><button className="gal-button ghost" onClick={() => act(() => setScreen(beginJourney(profile, true)))}>跳过开场 · 从单词开始</button><button className="gal-button ghost" onClick={() => { refresh(); setPanel('saves') }}>先去存档</button></div>{notice && <p role="status">{notice}</p>}</JourneyDialog>}
    {panel === 'saves' && <JourneyDialog title="旅途存档" close={() => setPanel(null)}><p className="journey-intro">自动保存记录当前旅途；手动存档是独立的回忆节点。读档前会保留你离开的进度。</p>
      <div className="save-current"><span>当前自动档</span><b>{hero.name}　Lv.{stats.level}</b><small>剧情节点、词之书、星砂与养成自动保存；未结算的战斗不保存。</small><div className="journey-actions"><button className="gal-link" onClick={() => setScreen('study')}>导出 / 导入备份</button><button className="gal-link" disabled={!active} onClick={() => setScreen(journeyPage())}>继续当前旅途</button></div></div>
      {book?.slots.map((entry, index) => <article className="journey-slot" key={index}><div className="save-rune" aria-hidden="true">{['Ⅰ', 'Ⅱ', 'Ⅲ'][index]}</div><div><h3>存档 {index + 1}</h3>{entry ? <SaveSummary entry={entry}/> : <span>空白书页 · 尚未存档</span>}</div><div className="save-slot-actions"><button disabled={!active} onClick={() => { setNotice(''); entry ? setPending({ mode: 'save', index }) : save(index) }}>{entry ? '覆盖存档' : '写入存档'}</button><button disabled={!entry} onClick={() => { setNotice(''); setPending({ mode: 'load', index }) }}>读取</button></div></article>)}
      {book?.departure && <article className="departure-save"><h3>上次离开的旅途</h3><SaveSummary entry={book.departure}/><button className="gal-link" onClick={() => setPending({ mode: 'load', index: 'departure' })}>回到这段旅途</button></article>}
      {pending && <div className="save-confirm" role="group" aria-label="确认存档操作"><p>{pending.mode === 'save' ? '覆盖这个手动存档？请确认不再需要这个回忆节点。' : '读取这段旅途？当前进度将留在“上次离开的旅途”。'}</p><div className="journey-actions"><button className="gal-button" onClick={() => pending.mode === 'save' ? save(pending.index as number) : load(pending.index)}>确认{pending.mode === 'save' ? '覆盖' : '读取'}</button><button className="gal-button ghost" onClick={() => setPending(null)}>取消</button></div></div>}{notice && <p role="status">{notice}</p>}
    </JourneyDialog>}
  </main>
}
