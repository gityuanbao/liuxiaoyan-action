import { usePronunciation, PronunciationFeedback } from './usePronunciation'
import { LearningResponse } from './LearningResponse'
import { correctionClue, learningResponse, type LearningFeedback } from './learning-feedback'
import { sfx } from '../audio'
import { activeRune, stageUnlocked } from './expedition-core'
import type { ExpeditionStage } from './expedition-data'
import { enemyIntent } from './duel-engine'
import { heroBond, spiritBond, practiceReward } from './growth-core'
import { StoryBattleVoice } from './StoryBattleVoice'
import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store'
import { PACKS, WORDS, SPIRITS, type StudyWord } from './words'
import { profileStats, selectWords, type LearningRecord } from './learning-core'
import { addLearningRecord, toggleNotebookWord, useLearning } from './learning-store'
import { Icon } from './Icon'
import { CHARACTERS } from './Appearance'
import { DuelArena } from './DuelArena'
import { prepareSpell } from './duel-engine'
import { SPELL_CARDS, type PreparedSpell } from './spell-cards'
import { CombatActions, CombatPreview } from './CombatLoadout'
import { CHARACTER_SKILLS, type SpiritId } from './combat-skills'
import { advanceDuel, castWord, castUltimate, castTactic, createDuel, DUEL_RULES, type DuelDifficulty, type DuelState } from './duel-engine'
import type { StoryEncounter } from './story-encounters'
import { STORY_BACKGROUNDS } from './world-lore'
import { BattleDebrief } from './BattleDebrief'
import { MONSTERS, MONSTER_IDS, monsterForEncounter, type MonsterId } from './monster-data'
import { HUMAN_CLIPS, humanClip } from './audio-library-data'

type Lesson = 'vocabulary' | 'sentence' | 'listening'
const TITLES = { vocabulary: '风之森林 · 拼写试炼', sentence: '星文高塔 · 句子试炼', listening: '回声海港 · 听力试炼' }
export function VocabularyBattle({ initialPack, lesson = 'vocabulary', story, onStoryReturn, expedition, onExpeditionReturn }: { initialPack: string; expedition?: ExpeditionStage; onExpeditionReturn?: (record?: LearningRecord) => void; lesson?: Lesson; story?: StoryEncounter & { chapter: string }; onStoryReturn?: (record?: LearningRecord) => void }) {
  const profile = useLearning()
  const { setScreen, displayName, settingsOpen } = useGameStore()
  const [pack, setPack] = useState(lesson === 'listening' && ['notebook', 'academic', 'beginner'].includes(initialPack) ? 'environment' : initialPack)
  const [monsterChoice, setMonsterChoice] = useState<MonsterId | 'auto'>('auto')
  const [encounterMonster, setEncounterMonster] = useState<MonsterId | null>(null)
  const [difficulty, setDifficulty] = useState<DuelDifficulty>(expedition?.difficulty ?? 'relaxed')
  const [mode, setMode] = useState<'copy' | 'recall'>(expedition?.recall ? 'recall' : 'copy')
  const [words, setWords] = useState<StudyWord[]>([])
  const monster = expedition?.monster ?? (words.length ? encounterMonster : null) ?? (monsterChoice === 'auto' ? monsterForEncounter(pack, lesson, story?.chapter) : monsterChoice)
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [hinted, setHinted] = useState(false)
  const [chanting, setChanting] = useState(false)
  const draft = useRef({ answer: '', hinted: false })
  const [listenType, setListenType] = useState<'word' | 'sentence'>('word')
  const [heard, setHeard] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const [casting, setCasting] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  const [duel, setDuel] = useState<DuelState>(createDuel('relaxed'))
  const [result, setResult] = useState<LearningRecord | null>(null)
  const [saved, setSaved] = useState(false)
  const [firstReward, setFirstReward] = useState(0)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState<LearningFeedback | null>(null)
  const correctedWords = useRef(new Set<string>())
  const [notice, setNotice] = useState('拼写蓄能，回车释放。连续 4 次命中触发星耀连击。')
  const state = useRef(duel)
  const storyStarted = useRef(false)
  const attempts = useRef<NonNullable<LearningRecord['words']>>([])
  const session = useRef('')
  const lock = useRef(false)
  const wrongWord = useRef(false)
  const nextTimer = useRef<ReturnType<typeof setTimeout>>()
  const input = useRef<HTMLInputElement>(null)
  const avatar = words.length ? duel.avatar : profile.avatar ?? 'mage'
  const companion = words.length ? duel.companion : (SPIRITS.find(s => s.id === profile.companion && profileStats(profile).battles >= s.threshold)?.id ?? 'moon') as SpiritId
  const word = words[index % words.length]
  const listening = lesson === 'listening'
  const sentence = lesson === 'sentence' || (listening && listenType === 'sentence')
  const expected = chanting ? CHARACTER_SKILLS[avatar].chant : word ? sentence ? word.example : word.word : ''
  const assisted = chanting || hinted || (!listening && mode === 'copy')
  const manuallyStopped = paused || settingsOpen || hidden
  const stopped = manuallyStopped || (listening && (!heard || audioPlaying))
  const voice = usePronunciation(manuallyStopped)
  const active = words.length > 0 && !duel.outcome
  function commit(next: DuelState) { state.current = next; setDuel(next) }
  useEffect(() => {
    const visibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', visibility)
    return () => { document.removeEventListener('visibilitychange', visibility); clearTimeout(nextTimer.current); window.speechSynthesis?.cancel() }
  }, [])
  useEffect(() => { if (manuallyStopped || duel.outcome) { audio.current?.pause(); setAudioPlaying(false) } }, [manuallyStopped, duel.outcome])
  useEffect(() => { if (active && !stopped && !casting) input.current?.focus() }, [index, active, stopped, casting])
  useEffect(() => {
    if (!active || stopped) return
    let previous = performance.now()
    const timer = setInterval(() => { const now = performance.now(); const delta = Math.min(now - previous, 500); previous = now; commit(advanceDuel(state.current, delta)) }, 100)
    return () => clearInterval(timer)
  }, [active, stopped])
  useEffect(() => {
    if (!duel.outcome || result) return
    clearTimeout(nextTimer.current)
    const record: LearningRecord = { ...(expedition ? { expedition: { stage: expedition.id, hp: duel.playerHp } } : {}), id: session.current, avatar: duel.avatar, companion: duel.companion, kind: lesson, outcome: duel.outcome, title: `${TITLES[lesson]} · ${MONSTERS[monster].name} · ${pack === 'review' ? '错词复习' : pack === 'notebook' ? '收藏词汇' : pack === 'academic' ? '学术词汇' : pack === 'human' ? '真人发音包' : PACKS.find(p => p.id === pack)?.name} · ${duel.outcome === 'victory' ? '决斗胜利' : '决斗落败'} · ${listening ? sentence ? '句子听写' : '单词听写' : mode === 'copy' ? '跟打' : '默写'}`, date: new Date().toISOString(), correct: duel.hits, total: duel.hits + duel.mistakes, duration: Math.max(1, Math.round(duel.elapsed / 1000)), ultimates: duel.ultimateUses, xp: (duel.hits - duel.ultimateUses) * (sentence ? 8 : 5) + duel.ultimateUses * 8 + (duel.outcome === 'victory' ? 20 : duel.hits > 0 ? 5 : 0), words: [...attempts.current] }
    setResult(record); save(record)
  }, [duel.outcome])
  function save(record: LearningRecord) { try { const receipt = addLearningRecord(record); setFirstReward(receipt?.firstClear ?? 0); setSaved(true); setError('') } catch { setError('成绩暂未保存，请重试保存或检查浏览器存储。') } }
  function start() {
    if (expedition && !stageUnlocked(profile, expedition.id)) { setError('请先完成前一段航路。'); return }
    const pool = (pack === 'human' ? WORDS.filter(w => humanClip(w.word)) : selectWords(profile, pack, 60)).filter(w => (!(expedition?.maxLength ?? story?.maxWordLength) || w.word.length <= (expedition?.maxLength ?? story?.maxWordLength)!) && (listening ? WORDS.some(original => original.id === w.id && original.pack !== 'beginner') : sentence ? !!w.example : true))
    if (!pool.length) { setError('这个主题暂没有可练习的内容，请选择其他主题。自定义词的句子练习需要先填写例句。'); return }
    setEncounterMonster(expedition?.monster ?? (monsterChoice === 'auto' ? monsterForEncounter(pack, lesson, story?.chapter) : monsterChoice))
    voice.reset(); clearTimeout(nextTimer.current); audio.current?.pause(); setHeard(false); setAudioPlaying(false); setChanting(false); commit(createDuel(difficulty, avatar, companion, heroBond(profile, avatar).rank, spiritBond(profile, companion).rank, !!(expedition?.seal || story?.ultimateSeal), { monster, hp: expedition?.hp, elite: expedition?.boss, rune: activeRune(profile) })); setWords(pool); setIndex(0); setAnswer(''); setHinted(false); setCasting(false); setPaused(false); setResult(null); setSaved(false); setFirstReward(0); setError(''); setNotice('拼写蓄能，回车释放。连续 4 次命中触发星耀连击。'); attempts.current = []; correctedWords.current.clear(); setFeedback(null); wrongWord.current = false; lock.current = false; session.current = `${expedition ? `expedition:${expedition.id}:` : story ? `story:${story.chapter}:` : `${lesson}:`}${crypto.randomUUID()}`
  }
  useEffect(() => { if ((story || expedition) && !storyStarted.current) { storyStarted.current = true; start() } }, [])
  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!word || stopped || lock.current || state.current.outcome || !answer.trim()) return
    const previous = state.current
    const corrected = wrongWord.current && !chanting, independent = !assisted && !wrongWord.current && !chanting
    const next = chanting ? castUltimate(state.current, answer) : castWord(state.current, answer, expected, sentence ? 'sentence' : 'word')
    const success = next.hits > state.current.hits
    if (!chanting) attempts.current.push({ id: word.id, correct: success, hinted: assisted || wrongWord.current })
    if (success) {
      voice.play(expected, chanting ? 'chant' : sentence ? 'sentence' : 'word', true)
      setFeedback(learningResponse({ state: next, previous, word: sentence ? '完整句子' : word.word, meaning: sentence ? word.translation : word.meaning, independent, corrected, ultimate: chanting }))
      if (corrected) correctedWords.current.add(word.id)
      if (typeof AudioContext !== 'undefined') sfx.lessonCorrect(independent || corrected || !!next.last?.burst)
    } else setFeedback({ id: next.hits + next.mistakes, tone: 'guide', title: '再试一次，这里有个线索', detail: correctionClue(answer, expected, sentence || chanting), next: '生命与能量不会因这次错拼减少；改好后再释放。' })
    commit(next)
    if (!success) { if (!chanting) wrongWord.current = true; setNotice(chanting ? '大招尚未成形：请检查完整长句。能量未消耗，连击已重置。' : sentence ? '句子尚未成形。检查漏词、词序与拼写。大小写和标点不影响命中；连击已重置。' : '咒语尚未成形。检查拼写后再次释放；连击已重置。'); return }
    if (chanting) {
      setNotice(`${CHARACTER_SKILLS[avatar].ultimate}已释放！命中造成 ${next.last?.damage} 伤害。${CHARACTER_SKILLS[avatar].effect.replace(/^造成 \d+ 伤害[。，；]/, '')}`)
      lock.current = true; setCasting(true)
      if (!next.outcome) nextTimer.current = setTimeout(() => { setChanting(false); setAnswer(draft.current.answer); setHinted(draft.current.hinted); setCasting(false); lock.current = false }, 850)
      return
    }
    setNotice(next.last?.warded ? '雾蚀已被削弱，名字仍被长句封印锁住。能量满后，完整咏唱专属大招。' : `${next.last?.spirit ? next.last.spirit + ' · ' : ''}${next.last?.burst ? '星耀连击' : '星芒冲击'}命中！造成 ${next.last?.damage} 点伤害。${word.word}：${word.meaning}`)
    lock.current = true
    setCasting(true)
    if (!next.outcome) nextTimer.current = setTimeout(() => { setIndex(i => i + 1); setHeard(false); setAudioPlaying(false); setAnswer(''); setHinted(false); setCasting(false); wrongWord.current = false; lock.current = false }, 420)
  }
  function toggleChant() {
    if (!active || stopped || casting || state.current.energy < 100) return
    if (chanting) { setChanting(false); setAnswer(draft.current.answer); setHinted(draft.current.hinted) }
    else { commit(prepareSpell(state.current, null)); draft.current = { answer, hinted }; setChanting(true); setAnswer(''); setNotice('输入角色专属长句，释放大招。咏唱期间对手仍会攻击。') }
    input.current?.focus()
  }
  function selectSpell(spell: PreparedSpell | null) {
    if (!active || stopped || casting || chanting || lock.current) return
    const next = prepareSpell(state.current, spell)
    commit(next)
    setNotice(next.preparedSpell ? `${SPELL_CARDS[next.preparedSpell].name}已准备，下一次正确拼写生效。` : '已返回基础咒卡。继续拼写即可攻击。')
    input.current?.focus()
  }
  async function playAudio() {
    if (!audio.current || manuallyStopped || casting || audioPlaying) return
    voice.stop()
    try { audio.current.currentTime = 0; setAudioPlaying(true); setError(''); await audio.current.play() }
    catch { setAudioPlaying(false); setError('音频未播放成功。请再次点击播放，或检查网页音量与网络。') }
  }
  function speak() {
    if (!word || manuallyStopped) return
    if (mode === 'recall') setHinted(true)
    voice.play(expected, chanting ? 'chant' : sentence ? 'sentence' : 'word')
  }

  const scene = story ? STORY_BACKGROUNDS[story.scene] : expedition ? expedition.region === '月光桥' ? STORY_BACKGROUNDS.prologue : expedition.region === '风之森林' ? STORY_BACKGROUNDS.forest : expedition.region === '回声海港' ? STORY_BACKGROUNDS.harbor : STORY_BACKGROUNDS.archive : undefined
  const battleVoice = duel.outcome === 'victory' ? '灯亮了。我们把名字找回来了。' : duel.last?.warded ? '还差最后的名字。积满能量，用完整长句解开封印。' : duel.botHp <= (duel.enemyMaxHp ?? 140) / 2 ? '它的雾正在散开。看清下一招，稳稳把句子写完。' : duel.botAttacks > 0 ? '我还在。看清蓄势，护盾和战技都能帮你争取时间。' : duel.hits > 0 ? '听到了吗？每个准确的回应，都让航路更近一点。' : '不用抢。先认出这个名字，再把它写下来。'
  const accuracy = duel.hits + duel.mistakes ? Math.round(duel.hits / (duel.hits + duel.mistakes) * 100) : 100
  return <section style={scene ? { backgroundImage: `linear-gradient(#0b11203d,#0b11205c),url(${scene})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} className={`spelling-duel ${story ? 'story-battle' : ''} ${sentence || chanting ? 'sentence-duel' : ''} ${result ? 'is-result' : words.length ? 'is-live' : 'is-setup'}`}>
    {expedition && <div className="expedition-battle-bar"><button onClick={() => { setPaused(true); onExpeditionReturn?.() }}>‹ 返回航路</button><b>{expedition.region} · {expedition.name}{expedition.boss ? " · 首领" : ""}</b><span title={enemyIntent(duel).counter}>{CHARACTERS[avatar].name}：{battleVoice}</span></div>}{story && <div className="story-battle-heading"><span>剧情遭遇 · {story.title}</span><p>{story.description}</p></div>}<DuelArena monster={monster} enemy={story?.enemy} state={words.length ? duel : createDuel(difficulty, avatar, companion, heroBond(profile, avatar).rank, spiritBond(profile, companion).rank, false, { monster, rune: activeRune(profile) })} avatar={avatar} active={active} paused={stopped || !!duel.outcome} playerName={displayName} companion={companion}/>{story && words.length > 0 && <StoryBattleVoice story={story} state={duel}/> }
    {result ? <div className="duel-result" role="dialog" aria-label="对战结果"><span className="scene-kicker">{duel.outcome === 'victory' ? '星光回应了你的咒语' : '下一次，会更加从容'}</span><h1>{duel.outcome === 'victory' ? '决斗胜利' : '本次决斗落败'}</h1><p>{duel.outcome === 'victory' ? '对手生命归零。每一次正确拼写，都汇聚成了你的力量。' : '你的生命归零。这次练习依然是值得记录的成长。'}</p><div className="duel-result-stats"><span><b>{duel.hits}</b> 命中</span><span><b>{duel.dealt}</b> 伤害</span><span><b>+{result.xp}</b> 星能</span><span><b>{duel.ultimateUses}</b> 长句大招</span></div><p role="status">{error || (saved ? '成长已保存。跟打、提示与错词会留在巩固列表。' : '正在保存…')}</p><div className="growth-reward" role="status">{saved ? `星砂 +${practiceReward(result).coins}${firstReward ? ` · 首通星砂 +${firstReward}` : ''} · 同行熟练度 +${practiceReward(result).bond} · 已入账` : '星砂与熟练度将在成绩保存后入账'}</div><div className="learning-result"><span>准确回应 <b>{duel.hits}</b> 次</span><span>独立回忆 <b>{attempts.current.filter(a => a.correct && !a.hinted).length}</b> 次</span><span>纠正成功 <b>{correctedWords.current.size}</b> 个词条</span></div><div className="button-row">{onExpeditionReturn && <button className="gal-button" disabled={!saved} onClick={() => onExpeditionReturn(result)}>{duel.outcome === 'victory' ? '继续航路 · 战后故事' : '返回航路 · 调整搭配'}</button>}{!saved && <button className="gal-button" onClick={() => save(result)}>重试保存</button>}{onStoryReturn && <button className="gal-button" disabled={!saved} onClick={() => onStoryReturn(result)}>{duel.outcome === 'victory' ? '战斗结束 · 继续对白' : '返回剧情 · 重新挑战'}</button>}<button className="gal-button" disabled={!saved} onClick={start}>再来一场</button><button className="gal-button ghost" disabled={!!expedition || !saved} onClick={() => { setWords([]); setResult(null); commit(createDuel(difficulty)) }}>调整试炼</button>{!story && !expedition && <><button className="gal-button" disabled={!saved} onClick={() => setScreen('story')}>继续旅途 · 主线剧情 →</button><button className="gal-link" onClick={() => setScreen('study')}>查看冒险手记 →</button></>}</div><PronunciationFeedback voice={voice} paused={manuallyStopped}/><BattleDebrief key={result.id} attempts={attempts.current} profile={profile} saved={saved} onReview={() => { if (expedition) { onExpeditionReturn?.(result); setScreen('notebook'); return } setPack('review'); setWords([]); setResult(null); commit(createDuel(difficulty, avatar, companion)); setError('') }}/></div>
      : !words.length ? <div className="duel-setup gal-dialogue"><div className="speaker-name">{TITLES[lesson]}<small>{pack === 'human' ? '真人录音 · 完整听完后拼写攻击' : '选择主题与难度'}</small></div><div className="duel-setup-top"><div><h1>{listening ? '倾听英文，以回声释放咒语' : sentence ? '让完整句子，汇聚更强的力量' : '以拼写施法，击退雾蚀小怪'}</h1><p>每次正确输入造成伤害。双方各 140 生命，生命归零才分胜负。</p></div><button className="gal-link" onClick={() => setScreen('appearance')}>当前形象：{CHARACTERS[avatar].title} · 更换 ↗</button></div><CombatPreview avatar={avatar} companion={companion} heroRank={heroBond(profile, avatar).rank} spiritRank={spiritBond(profile, companion).rank}/><div className="duel-options"><label>冒险主题<select aria-label="冒险主题" value={pack} onChange={e => { setPack(e.target.value); if (e.target.value === 'human') setListenType('word') }}>{PACKS.filter(p => !listening || p.id !== 'beginner').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}{!listening && <><option value="academic">学术词汇 · 7+ 积累</option><option value="notebook" disabled={!profile.notebook?.saved.length}>收藏词汇（{profile.notebook?.saved.length ?? 0} 词）</option></>}{listening && <option value="human">真人发音包（{HUMAN_CLIPS.length} 词）</option>}<option value="review" disabled={!profileStats(profile).review}>错词复习（{profileStats(profile).review} 词）</option></select></label><label>遭遇小怪<select aria-label="遭遇小怪" value={monsterChoice} onChange={e => { setMonsterChoice(e.target.value as MonsterId | 'auto'); setEncounterMonster(null) }}><option value="auto">随地区出现</option>{MONSTER_IDS.map(id => <option key={id} value={id}>{MONSTERS[id].name} · {MONSTERS[id].habitat}</option>)}</select></label><label>对手强度<select aria-label="对手强度" value={difficulty} onChange={e => setDifficulty(e.target.value as DuelDifficulty)}>{Object.entries(DUEL_RULES).map(([id, r]) => <option key={id} value={id}>{r.label} · 每 {r.botInterval / 1000} 秒攻击</option>)}</select></label>{listening ? <label>听写内容<select aria-label="听写内容" value={listenType} onChange={e => setListenType(e.target.value as 'word' | 'sentence')}><option value="word">单词听写</option><option value="sentence" disabled={pack === 'human'}>完整句子听写</option></select></label> : <div className="spell-mode"><span>咒语方式</span><div><button className={mode === 'copy' ? 'selected' : ''} onClick={() => setMode('copy')}>跟打练习</button><button className={mode === 'recall' ? 'selected' : ''} onClick={() => setMode('recall')}>中文默写</button></div></div>}<button className="gal-button" disabled={pack === 'review' && !profileStats(profile).review} onClick={start}>开始决斗 <Icon name="sword" size={18}/></button></div><small className="duel-rules">{listening ? <>{pack === 'human' ? 'Wikimedia Commons 真人单词录音。' : '原创英文合成音频。'}播放时暂停对手，完整听完一次才能攻击；可重听。查看原文计为提示练习。</> : '跟打显示英文，默写只显示中文。'}{sentence && ' 句子忽略大小写与标点，必须拼对完整词序。'} 连续 4 次命中触发加强法术，错拼重置连击。切换标签页或打开设置自动暂停。</small></div>
      : <><div className="duel-live-meta"><div className="battle-glance"><span>命中 <b>{duel.hits}</b></span><span>准确率 <b>{accuracy}%</b></span><button onClick={() => setPaused(!paused)}>{paused ? '继续决斗' : '暂停'}</button></div></div><div className="spell-console gal-dialogue"><div className="speaker-name">{CHARACTERS[avatar].name}<small>{chanting ? CHARACTER_SKILLS[avatar].ultimate : listening ? sentence ? '句子听写' : '单词听写' : mode === 'copy' ? '跟打咒语' : '中文默写'}</small></div><CombatActions state={duel} disabled={stopped || casting} chanting={chanting} onChant={toggleChant} onPrepare={selectSpell} onTactic={() => { if (!stopped && !casting && !chanting) { commit(castTactic(state.current)); input.current?.focus() } }}/><div className="spell-prompt"><div>{assisted ? <h2 className="typed-word">{expected.split('').map((letter, i) => <span className={i < answer.length ? answer[i]?.toLowerCase() === letter.toLowerCase() ? 'typed-correct' : 'typed-wrong' : ''} key={i}>{letter}</span>)}</h2> : <h2>{listening ? sentence ? '听见一句英文，写出完整咒语' : '听见一个单词，写出它的名字' : sentence ? word?.translation : word?.meaning}</h2>}<p>{chanting ? CHARACTER_SKILLS[avatar].translation : listening ? '先完整听完，再输入答案。原文默认隐藏，可查看提示。' : sentence ? assisted ? word?.translation : '根据中文译文，写出完整英文句子。' : assisted ? word?.meaning : '根据中文释义，拼出英文单词。'}</p></div>{!chanting && <div className="spell-tools"><button aria-label="收藏当前单词" onClick={() => { try { toggleNotebookWord(word.id) } catch { setError('收藏未保存，请检查浏览器存储。') } }}>{profile.notebook?.saved.includes(word.id) ? '★ 已收藏' : '☆ 收藏'}</button><button onClick={listening ? playAudio : speak} disabled={manuallyStopped || (listening && (casting || audioPlaying))} aria-label={listening ? '播放英文' : sentence ? '朗读句子' : '朗读单词'}>{listening && (audioPlaying ? '正在播放…' : heard ? '再次播放' : '播放英文')}<Icon name="sound" size={18}/></button>{(listening || mode === 'recall') && <button onClick={() => setHinted(true)}>{sentence ? '查看原文' : '查看拼写'}</button>}</div>}</div>{listening && <audio ref={audio} key={`${index}-${word?.id}`} src={pack === 'human' && !sentence ? humanClip(word?.word)?.file : `/audio/${sentence ? 'sentence' : 'word'}-${word?.id}.wav`} preload="auto" onEnded={() => { setHeard(true); setAudioPlaying(false) }} onError={() => { setAudioPlaying(false); setError('音频加载失败，请检查网络后重试播放。') }}/>}<form onSubmit={submit}><input ref={input} aria-label={chanting ? '输入大招长句' : sentence ? '输入英文句子' : '输入英文单词'} value={answer} disabled={stopped || casting || !!duel.outcome} onChange={e => setAnswer(e.target.value)} placeholder={manuallyStopped ? '决斗已暂停' : listening && !heard ? '请先点击播放，完整听完英文…' : '输入完整英文，按 Enter 释放攻击…'} autoComplete="off" autoCapitalize="off" spellCheck={false}/><button className="gal-button" type="submit" aria-label="释放攻击" disabled={!answer.trim() || stopped || casting}>{chanting ? '释放大招' : duel.preparedSpell ? `打出${SPELL_CARDS[duel.preparedSpell].type}卡` : '打出咒卡'} <Icon name="spark" size={17}/></button></form><LearningResponse feedback={feedback} correct={duel.hits} pendingXp={(duel.hits - duel.ultimateUses) * (sentence ? 8 : 5) + duel.ultimateUses * 8} paused={manuallyStopped} instruction={listening && (!heard || audioPlaying) ? audioPlaying ? '正在播放英文，听完后再写。' : '先播放并完整听完英文，再输入。' : chanting ? '完整写出专属长句；可以点大招牌返回普通攻击。' : duel.energy >= 100 ? '能量已满，可以点击大招牌咏唱。' : undefined}><PronunciationFeedback voice={voice} paused={manuallyStopped}/></LearningResponse><div className="spell-bottom"><p role="status">{manuallyStopped ? '时间与对手行动已暂停。' : listening && (!heard || audioPlaying) ? audioPlaying ? '正在播放英文，对手暂停。听完后可以攻击。' : '等待播放英文，对手暂停。' : notice}</p><span>{chanting ? '完整咏唱 · 回车释放大招' : '每 4 连击 · 星耀爆发'}</span></div>{error && <p role="status">{error}</p>}</div></>}
    <audio key="feedback-audio" ref={voice.player} preload="none" aria-label="拼写完成后的英文朗读"/>
  </section>
}
