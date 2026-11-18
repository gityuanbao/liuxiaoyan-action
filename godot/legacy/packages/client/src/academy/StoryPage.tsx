import { DialogueFrame } from './DialogueFrame'
import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store'
import { completeStory, moveStory, skipOpeningDialogue, useLearning } from './learning-store'
import { CharacterArt, CHARACTERS } from './Appearance'
import { STORY_CHAPTERS, chapterUnlocked, resumeStoryIndex } from './story-data'
import { STORY_BACKGROUNDS, STORY_VIDEOS, type StorySceneId } from './world-lore'
import { STORY_ENCOUNTERS, storyEncounterCleared } from './story-encounters'
import { VocabularyBattle } from './VocabularyBattle'
import { TrialPage } from './TrialPage'
import { ArcaneSigil } from './ArcaneArt'

export function StoryPage() {
  const profile = useLearning()
  const setScreen = useGameStore(s => s.setScreen)
  const reducedMotion = useGameStore(s => s.reducedMotion)
  const [selected, setSelected] = useState(() => resumeStoryIndex(profile))
  const [notice, setNotice] = useState(''), [chaptersOpen, setChaptersOpen] = useState(false)
  const chapter = STORY_CHAPTERS[selected], encounter = STORY_ENCOUNTERS[chapter.id]
  const cleared = storyEncounterCleared(profile, chapter.id)
  const storedPosition = profile.story?.positions[chapter.id] ?? 0
  const position = !cleared && encounter ? Math.min(storedPosition, encounter.at) : storedPosition
  const [mission, setMission] = useState(() => selected === 0 && !!encounter && position === encounter.at && !cleared)
  const line = chapter.lines[position], player = profile.avatar ?? 'mage'
  const npc = line.speaker === 'you' ? [...chapter.lines.slice(0, position)].reverse().find(l => l.speaker !== 'you')?.speaker ?? 'knight' : line.speaker
  const npcAvatar = npc === 'you' ? 'knight' : npc
  const otherSpeaker = chapter.lines.find(l => l.speaker !== 'you' && l.speaker !== player)?.speaker
  const leftActor = line.speaker !== 'you' && npcAvatar === player && otherSpeaker && otherSpeaker !== 'you' ? otherSpeaker : player
  const choice = profile.story?.choices[chapter.id], completed = profile.story?.completed.includes(chapter.id)
  const scene = line.scene ?? chapter.scene ?? ({ arrival: 'prologue', forest: 'forest', archive: 'archive', tide: 'harbor', constellation: 'courtyard' } as Record<string, StorySceneId>)[chapter.id] ?? 'courtyard'
  const previous = useRef(scene), [outgoing, setOutgoing] = useState<StorySceneId | null>(null)
  useEffect(() => { if (previous.current === scene) return; setOutgoing(previous.current); previous.current = scene; const timer = setTimeout(() => setOutgoing(null), 700); return () => clearTimeout(timer) }, [scene])
  function go(next: number, picked?: string) { try { moveStory(chapter.id, next, picked); setNotice('') } catch { setNotice('剧情进度未保存，请完成本段任务或检查浏览器存储。') } }
  function finish() {
    try {
      completeStory(chapter.id); setNotice('这段旅途已记入冒险手记。')
      const nextProfile = { ...profile, story: { completed: [...(profile.story?.completed ?? []), chapter.id], choices: profile.story?.choices ?? {}, positions: profile.story?.positions ?? {} } }
      if (selected + 1 === STORY_CHAPTERS.length) { setScreen('world'); return }
      if (chapterUnlocked(nextProfile, selected + 1)) { setSelected(selected + 1); setChaptersOpen(false) }
      else setNotice(`下一段旅途：${STORY_CHAPTERS[selected + 1].title}。${STORY_CHAPTERS[selected + 1].requirement}，再来继续故事。`)
    } catch { setNotice('请先完成本章任务，再记录这段旅途。') }
  }
  if (mission && encounter) return <div className="story-mission">
    {encounter.trial ? <><div className="story-task-strip"><span>剧情任务 · {encounter.title}</span><button onClick={() => setMission(false)}>返回对白</button></div><div className="story-trial-body"><TrialPage initialTrial={encounter.trial} onStoryReturn={() => setMission(false)}/></div></>
      : <><button className="mission-return" onClick={() => setMission(false)}>‹ 返回对白 · 未结束战斗不结算</button><VocabularyBattle key={chapter.id} initialPack={encounter.pack ?? 'environment'} lesson={encounter.lesson} story={{ ...encounter, chapter: chapter.id }} onStoryReturn={record => { setMission(false); if (record?.outcome === 'victory') go(encounter.at + 1); else setNotice('雾蚀尚未散去。休整之后，可以再次挑战。') }}/></>}
  </div>
  return <section className={`story-scene cinematic-story dialogue-theatre speaking-${line.speaker === 'you' ? 'left' : 'right'}`}>
    <div className="story-background" aria-hidden="true">{outgoing && <img className="scene-outgoing" src={STORY_BACKGROUNDS[outgoing]} alt=""/>}{STORY_VIDEOS[scene] && !reducedMotion ? <video key={scene} src={STORY_VIDEOS[scene]} poster={STORY_BACKGROUNDS[scene]} autoPlay muted loop playsInline/> : <img className={`scene-current scene-${scene}`} key={scene} src={STORY_BACKGROUNDS[scene]} alt=""/>}<div/></div>
    <div className="theatre-frame" aria-hidden="true"/><ArcaneSigil className="theatre-sigil"/>
    <div className="story-caption"><span>{line.caption ?? chapter.region}</span><h2>{chapter.title}</h2><small>{chapter.volume === 2 ? '第二卷 · 四种回应' : '第一卷 · 星灯的回声'}</small></div>
    {selected === 0 && !cleared && position < encounter.at && <button className="opening-skip" onClick={() => { try { skipOpeningDialogue(); setMission(true); setNotice('') } catch { setNotice('开场进度未保存，请检查浏览器存储后重试。') } }}>跳过开场 · 从单词开始</button>}
    <button className="chapter-trigger" onClick={() => setChaptersOpen(!chaptersOpen)} aria-expanded={chaptersOpen}>✧ 旅途章节</button>
    {chaptersOpen && <aside className="story-chapters"><div className="chapter-panel-head"><h1>旅途中的故事</h1><button onClick={() => setChaptersOpen(false)} aria-label="关闭章节目录">×</button></div><div className="story-chapter-scroll">{STORY_CHAPTERS.map((c, i) => { const unlocked = chapterUnlocked(profile, i); return <button key={c.id} className={`${selected === i ? 'selected' : ''} ${!unlocked ? 'locked' : ''}`} disabled={!unlocked} onClick={() => { setSelected(i); setNotice(''); setChaptersOpen(false) }}><span>{c.volume === 2 ? '第二卷 · ' : ''}{profile.story?.completed.includes(c.id) ? '✦ 已记录' : unlocked ? '◇ 继续冒险' : '◇ 尚未唤醒'}</span><b>{c.title}</b><small>{c.requirement}</small></button> })}</div><button className="gal-link" onClick={() => setScreen('world')}>阅读世界档案 →</button></aside>}
    <div className={`story-actor actor-left ${line.speaker === 'you' ? 'is-speaking' : 'is-listening'}`}><CharacterArt avatar={leftActor} side="left"/><span>{leftActor === player ? '你' : CHARACTERS[leftActor].name}<small>{leftActor === player ? '星语旅人 · ' : '同行旅伴 · '}{CHARACTERS[leftActor].title}</small></span></div>
    <div className={`story-actor actor-right ${line.speaker !== 'you' ? 'is-speaking' : 'is-listening'}`} key={npcAvatar}><CharacterArt avatar={npcAvatar} side="right"/><span>{CHARACTERS[npcAvatar].name}<small>{CHARACTERS[npcAvatar].title}</small></span></div>
    <DialogueFrame className="story-dialogue" avatar={line.speaker === 'you' ? player : npcAvatar} name={line.speaker === 'you' ? '你' : CHARACTERS[npcAvatar].name} role={line.speaker === 'you' ? '星语旅人' : CHARACTERS[npcAvatar].title} side={line.speaker === 'you' ? 'left' : 'right'}><p key={`${chapter.id}-${position}`} className="story-line-enter">{choice === 'courage' && line.alternate ? line.alternate : line.text}</p>
      {position === chapter.choiceAt ? <div className="story-choices" aria-label="剧情选择">{chapter.choices.map((c, index) => <button key={c.id} onClick={() => go(position + 1, c.id)}><i className="choice-mark" aria-hidden="true">{index === 0 ? 'Ⅰ' : 'Ⅱ'}</i><span className="choice-copy">{c.text}</span><span className="choice-arrow" aria-hidden="true">✧</span></button>)}</div> : <div className="dialogue-footer"><span>{completed ? '本章已记录 · 可重读' : `旅途 ${position + 1} / ${chapter.lines.length}`}</span>{position > 0 && <button onClick={() => go(position - 1)}>上一段</button>}{encounter && position === encounter.at && !cleared ? <button className="encounter-action" onClick={() => setMission(true)}>{encounter.trial ? '追踪线索 · 进入任务' : '雾蚀来袭 · 进入战斗'} ◆</button> : position + 1 < chapter.lines.length ? <button onClick={() => go(position + 1)}>下一段对话 ◆</button> : <div>{completed && <button onClick={() => go(0)}>重读本章</button>}<button onClick={finish}>{completed ? '继续旅途' : '记录本章 · 完成剧情'} ◆</button></div>}</div>}
      {encounter && position === encounter.at && !cleared && <div className="encounter-preview"><b>{encounter.title}</b><span>{encounter.description}</span></div>}{notice && <div className="story-notice" role="status">{notice}{completed && selected + 1 < STORY_CHAPTERS.length && !chapterUnlocked(profile, selected + 1) && <button className="gal-button" onClick={() => setScreen(STORY_CHAPTERS[selected + 1].seal ? 'exam' : STORY_CHAPTERS[selected + 1].requires === 'reading' ? 'atlas' : STORY_CHAPTERS[selected + 1].requires === 'sentence' ? 'sentence' : STORY_CHAPTERS[selected + 1].requires === 'listening' ? 'listening' : 'vocabulary')}>前往下章的线索 →</button>}</div>}
    </DialogueFrame>
  </section>
}
