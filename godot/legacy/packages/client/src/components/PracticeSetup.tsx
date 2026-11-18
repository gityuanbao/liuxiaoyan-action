import { useState } from 'react'
import { PASSAGES, ROUND_DURATION, type Difficulty } from '@typeduel/shared'
import { DIFFICULTY_LABELS } from '../labels'
import { useGameStore } from '../store'
import type { PracticeMode, PracticeConfig } from '../practice/engine'
import { getPersonalBests, getPbKey } from '../practice/engine'
import { Icon, PageEmblem } from '../academy/Icon'
import { CharacterArt } from '../academy/Appearance'
import { CHARACTERS } from '../academy/character-data'
import { useLearning } from '../academy/learning-store'

const MODES: { value: PracticeMode; label: string; desc: string; icon: string; rule: string }[] = [
  { value: 'free', label: '自由练习', desc: '完成一段英文，不必追赶时间。', icon: 'leaf', rule: '完整输入一段英文后结束，错字可退格修改。' },
  { value: 'timed', label: '限时挑战', desc: '在沙漏流尽前，多写一段咒语。', icon: 'clock', rule: '倒计时结束后结算，尽量提高正确输入的数量。' },
  { value: 'accuracy', label: '精准挑战', desc: '保持准确，让咒文不断延伸。', icon: 'compass', rule: '文本持续延伸，第一次错误输入即结束。' },
  { value: 'sudden-death', label: '极限挑战', desc: '维持词速，守住星灯的亮度。', icon: 'spark', rule: '开始十秒后检查词速；低于门槛或两分钟到时结束。' },
  { value: 'marathon', label: '耐力挑战', desc: '五分钟长途修炼，找到节奏。', icon: 'shield', rule: '持续输入五分钟，到时结算。先稳住准确率，再提升速度。' },
  { value: 'bot', label: '精灵对战', desc: '与训练幻影比拼输入与技能。', icon: 'sword', rule: '逐字输入与训练幻影交锋，能量足够时自动释放技能；生命归零或九十秒到时结算。' },
]
const DURATIONS = [15, 30, 60, 120]
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const BOT_DIFFICULTIES = [
  { value: 'easy' as const, label: '初阶幻影', desc: '约 35 词/分' },
  { value: 'medium' as const, label: '中阶幻影', desc: '约 65 词/分' },
  { value: 'hard' as const, label: '高阶幻影', desc: '约 110 词/分' },
]
const TEXT_GUIDES = { easy: '常用词与短句，先熟悉英文输入。', medium: '较长句子与多种标点，练习连贯输入。', hard: '更复杂的词句，适合已熟悉键盘的旅人。' }

export function PracticeSetup() {
  const setPracticeConfig = useGameStore(s => s.setPracticeConfig)
  const setScreen = useGameStore(s => s.setScreen)
  const profile = useLearning()
  const avatar = profile.avatar ?? 'mage'
  const [mode, setMode] = useState<PracticeMode>('free')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [duration, setDuration] = useState(60)
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const config: PracticeConfig = { mode, difficulty, duration, botDifficulty }
  const pb = getPersonalBests()[getPbKey(config)]
  const chosen = MODES.find(m => m.value === mode)!
  const sample = PASSAGES.find(p => p.difficulty === difficulty)?.text
  const timeLabel = mode === 'timed' ? `${duration} 秒` : mode === 'marathon' ? '5 分钟' : mode === 'sudden-death' ? '至多 2 分钟' : mode === 'bot' ? `${ROUND_DURATION} 秒` : '不限时'

  return <section className="practice-hall" aria-labelledby="practice-hall-title">
    <header className="practice-heading"><PageEmblem name="keyboard"/>
      <div><h1 id="practice-hall-title">打字试炼</h1><p>在星文高塔练习英文输入，把准确与节奏带回冒险。</p></div>
      <span className="practice-location"><Icon name="book" size={20}/>星文高塔</span>
    </header>
    <div className="practice-hall-body">
      <aside className="practice-vista" aria-label="同行旅伴">
        <div className="practice-vista-sigil" aria-hidden="true"/>
        <CharacterArt avatar={avatar} side="left"/>
        <div className="practice-vista-caption"><span>与你同行</span><h2>{CHARACTERS[avatar].name}</h2><p>{CHARACTERS[avatar].description}</p></div>
      </aside>
      <section className="practice-modes" aria-labelledby="practice-modes-title">
        <div className="practice-section-title"><h2 id="practice-modes-title">选择试炼</h2><span>找到适合自己的节奏</span></div>
        <div className="practice-mode-grid" role="group" aria-label="挑战模式">
          {MODES.map(m => <button key={m.value} onClick={() => setMode(m.value)} className={`practice-mode ${mode === m.value ? 'selected' : ''}`} aria-pressed={mode === m.value} data-testid={`mode-${m.value}`}>
            <span className="practice-mode-crest"><Icon name={m.icon} size={25}/></span>
            <b>{m.label}</b><small>{m.desc}</small>
            <span className="practice-mode-check" aria-hidden="true">{mode === m.value ? '◆' : '◇'}</span>
          </button>)}
        </div>
      </section>
      <aside className="practice-brief" aria-label="试炼规则与难度">
        <div className="practice-rule" aria-live="polite"><span>本次试炼</span><h2><Icon name={chosen.icon} size={20}/>{chosen.label}</h2><p>{chosen.rule}</p><div className="practice-rule-meta"><span><Icon name="clock" size={15}/>{timeLabel}</span>{mode === 'sudden-death' && <span>最低 {difficulty === 'easy' ? 20 : difficulty === 'medium' ? 35 : 50} 词/分</span>}</div></div>
        <fieldset className="practice-choice"><legend>文本难度</legend><div className="practice-choice-row">{DIFFICULTIES.map(d => <button key={d} aria-pressed={difficulty === d} onClick={() => setDifficulty(d)} className={difficulty === d ? 'selected' : ''}>{DIFFICULTY_LABELS[d]}</button>)}</div><p>{TEXT_GUIDES[difficulty]}</p></fieldset>
        {mode === 'timed' && <fieldset className="practice-choice"><legend>挑战时长</legend><div className="practice-choice-row">{DURATIONS.map(d => <button key={d} onClick={() => setDuration(d)} aria-pressed={duration === d} className={duration === d ? 'selected' : ''} data-testid={`duration-${d}`}>{d} 秒</button>)}</div></fieldset>}
        {mode === 'bot' && <fieldset className="practice-choice"><legend>幻影难度</legend><div className="practice-choice-row practice-bot-choices">{BOT_DIFFICULTIES.map(b => <button key={b.value} onClick={() => setBotDifficulty(b.value)} aria-pressed={botDifficulty === b.value} className={botDifficulty === b.value ? 'selected' : ''} data-testid={`bot-${b.value}`}><b>{b.label}</b><small>{b.desc}</small></button>)}</div></fieldset>}
        <div className="practice-text-sample"><span>文本示例 · 每场随机</span><p lang="en">{sample}</p></div>
        {pb && <div className="practice-personal-best" data-testid="personal-best"><Icon name="trophy" size={19}/><div><span>此配置的个人最佳</span><b>{pb.wpm} <small>词/分</small></b><small>{pb.accuracy}% 正确率 · {pb.streak} 连击</small></div></div>}
      </aside>
    </div>
    <footer className="practice-hall-actions">
      <div><b>{chosen.label}</b><span>{DIFFICULTY_LABELS[difficulty]}文本 · {timeLabel}</span></div>
      <button className="gal-button ghost" onClick={() => setScreen('academy')}>返回群岛</button>
      <button className="gal-button" data-testid="start-practice" onClick={() => { setPracticeConfig(config); setScreen('practice') }}>开始试炼<Icon name="spark" size={19}/></button>
    </footer>
  </section>
}
