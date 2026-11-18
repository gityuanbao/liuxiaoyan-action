import { useEffect, useState } from 'react'
import { setDailyGoal, setLearningGoals, useLearning } from './learning-store'
import { profileStats } from './learning-core'
import { defaultLearningGoals, MAX_DAILY_WORDS } from './learning-goals'
import { useGameStore } from '../store'

export function DailyGoal({ detailed = false }: { detailed?: boolean }) {
  const profile = useLearning()
  const [goal, setGoal] = useState(String(profile.goal))
  const goals = profile.learningGoals ?? defaultLearningGoals()
  const [band, setBand] = useState(String(goals.band)), [note, setNote] = useState(goals.note)
  const [notice, setNotice] = useState('')
  const stats = profileStats(profile)
  useEffect(() => setGoal(String(profile.goal)), [profile.goal])
  useEffect(() => { setBand(String(goals.band)); setNote(goals.note) }, [goals.band, goals.note])
  return <section className={`world-goal ${detailed ? 'personal-goals' : ''}`}>
    <div><span>今日词汇目标</span><b>{stats.todayWords}<small> / {profile.goal} 词</small></b></div>
    <div className="world-goal-track"><i style={{ width: `${Math.min(100, stats.todayWords / profile.goal * 100)}%` }}/></div>
    <form onSubmit={e => { e.preventDefault(); try { detailed ? setLearningGoals(Number(goal), Number(band), note) : setDailyGoal(Number(goal)); setNotice('目标已保存。') } catch (error) { setNotice(error instanceof Error ? error.message : '保存失败，请检查浏览器存储。') } }}>
      <label>每日词数<input aria-label="每日目标词数" type="number" min="1" max={MAX_DAILY_WORDS} step="1" required value={goal} onChange={e => setGoal(e.target.value)}/></label>
      {detailed && <><div className="goal-presets" aria-label="词数快捷选择">{[10, 20, 30, 50].map(n => <button type="button" key={n} onClick={() => setGoal(String(n))}>{n} 词</button>)}</div><label>目标雅思分数<input aria-label="目标雅思分数" type="number" min="1" max="9" step="0.5" required value={band} onChange={e => setBand(e.target.value)}/></label><label>我的目标<textarea aria-label="我的学习目标" maxLength={160} value={note} onChange={e => setNote(e.target.value)} placeholder="例如：先记住日常单词，再练习听懂校园对话。"/></label><small className="goal-help">每天 1–1000 词，可直接填写；雅思目标按 0.5 分调整。分数用于个人计划，练习完成度不等于考试成绩。</small></>}
      <button type="submit">保存目标</button>
    </form>
    {!detailed && <button className="goal-customize" onClick={() => { useGameStore.setState({ studySection: 'goals' }); useGameStore.getState().setScreen('study') }}>自定义目标</button>}
    <p role="status">{notice || (stats.todayWords >= profile.goal ? '今日目标已达成，可以继续探索。' : '按今日练过的不同词汇计数')}</p>
  </section>
}
