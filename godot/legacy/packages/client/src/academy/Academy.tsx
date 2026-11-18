import { SpiritSanctuary } from './SpiritSanctuary'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useGameStore } from '../store'
import { Icon } from './Icon'
import { SPIRITS, WORDS } from './words'
import { profileStats, parseBackup } from './learning-core'
import { addLearningRecord, restoreLearning, setCompanion, setDailyGoal, useLearning } from './learning-store'
import { WorldMap } from './WorldMap'
import { DailyGoal } from './DailyGoal'
import { SPIRIT_SKILLS, type SpiritId } from './combat-skills'
import { OriginalReading } from './OriginalReading'
import { allStudyWords } from './notebook-data'

export function AcademyLayout({ children }: { children: ReactNode }) {
  const { screen, setScreen, setSettingsOpen } = useGameStore()
  const profile = useLearning()
  const stats = profileStats(profile)
  const content = useRef<HTMLElement>(null)
  useEffect(() => { document.documentElement.scrollTop = 0; document.body.scrollTop = 0; if (content.current) content.current.scrollTop = 0 }, [screen])
  const scene = ['expedition', 'camp', 'academy', 'appearance', 'vocabulary', 'sentence', 'listening', 'story'].includes(screen)
  return <div className={`gal-shell screen-${screen}`}>
    <div className="world-background"/><div className="world-shade"/><div className="world-stars" aria-hidden="true"/>
    <header className="gal-topbar"><button className="gal-logo" onClick={() => setScreen('academy')}><span>✦</span><b>星语学院<small>星光与文字的契约</small></b></button>
      {screen !== 'academy' && <button className="return-to-islands" onClick={() => setScreen('academy')}>‹ 返回群岛</button>}
      <div className="gal-status"><button className="title-return" onClick={() => setScreen('title')} aria-label="返回标题与旅途存档">主菜单</button><span>Lv.{stats.level}</span><b className="wallet-balance" title="完成练习积累，可用于角色与精灵养成">星砂 {profile.growth?.coins ?? 0}</b><button onClick={() => setSettingsOpen(true)} aria-label="打开系统设置"><Icon name="settings" size={19}/></button></div>
    </header>
    <main ref={content} className={`gal-content ${scene ? 'scene-content' : 'journal-content'} ${screen === 'atlas' ? 'atlas-content' : ''}`}>{children}</main>
  </div>
}

export function AcademyHome({ onExplore }: { onExplore: (pack: string) => void }) { return <WorldMap onExplore={onExplore}/> }

export function AtlasPage() {
  const iframe = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<{ available: boolean; readingCount: number } | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => { let live = true; fetch('/api/atlas-status').then(r => { if (!r.ok) throw new Error(); return r.json() }).then(data => { if (live) setStatus(data) }).catch(() => { if (live) setError('阅读系统暂时无法连接，请稍后重试。') }); return () => { live = false } }, [])
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!iframe.current?.contentWindow || event.origin !== location.origin || event.source !== iframe.current.contentWindow) return
      const r = event.data
      if (r?.type !== 'ielts-atlas-result' || r.source !== 'ielts-atlas' || r.version !== 1 || r.committed !== true || r.practiceType !== 'reading' || typeof r.id !== 'string' || !r.id || typeof r.title !== 'string' || ![r.score, r.total, r.duration].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0) || r.total <= 0 || r.score > r.total || !Number.isFinite(Date.parse(r.completedAt))) return
      try { addLearningRecord({ id: `atlas:${r.id}`, kind: 'reading', title: r.title.slice(0, 200), date: r.completedAt, correct: r.score, total: r.total, duration: Math.min(r.duration, 86400), xp: 30 }); setNotice('阅读成绩已同步到学习档案。') } catch { setNotice('本次成绩同步失败，请到学习档案导出备份并检查浏览器存储。') }
    }
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive)
  }, [])
  return <section className="atlas-folio"><div className="page-heading"><div><span className="eyebrow">阅读秘境 · IELTS</span><h1>在阅读中，探索新的世界</h1><p>阅读、定位与理解，也能成为冒险的一部分。</p></div>{status?.available && <a href="/ielts-atlas/" target="_blank" rel="noreferrer" className="secondary-button">独立窗口打开 <Icon name="arrow" size={16}/></a>}</div>
    <div className="atlas-info"><span><Icon name="book" size={18}/>{status?.readingCount ? `${status.readingCount} 篇阅读资源` : '原创雅思题型练习'}</span><span>完成提交后自动同步成绩</span><span>{status?.available ? '听力需自行导入资源' : '判断题 · 单词填空'}</span></div>
    {notice && <div role="status" className="save-notice">{notice}</div>}
    {error || status?.available === false ? <OriginalReading/> : !status ? <div className="empty-state">正在打开阅读秘境…</div> : <iframe ref={iframe} className="atlas-frame" src="/ielts-atlas/" title="雅思阅读练习系统" onLoad={() => iframe.current?.contentWindow?.postMessage({ type: 'ielts-atlas-sync' }, location.origin)}/>}
    <p className="source-note">支持独立接入 <a href="https://github.com/sallowayma-git/IELTS-practice" target="_blank" rel="noreferrer">IELTS-practice</a>（GPL-3.0）。公网版提供原创短篇题型训练；本地 Atlas 题源与第三方素材供个人备考。</p>
  </section>
}

export function StudyPage({ onReview }: { onReview: () => void }) {
  const profile = useLearning()
  const stats = profileStats(profile)
  const tab = useGameStore(s => s.studySection)
  const setTab = (studySection: 'records' | 'words' | 'goals') => useGameStore.setState({ studySection })
  const [message, setMessage] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<string | null>(null)
  function exportData() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `星语学院学习备份-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section className="study-folio"><div className="page-heading"><div><span className="eyebrow">每一份努力，都有迹可循</span><h1>你的学习成长档案</h1><p>回顾练习，巩固词汇，让进步看得见。</p></div><div className="button-row"><button className="secondary-button" onClick={exportData}><Icon name="download" size={16}/>导出备份</button><button className="text-button" onClick={() => file.current?.click()}>导入备份</button><input hidden ref={file} type="file" accept=".json,application/json" onChange={async e => { const selected = e.target.files?.[0]; if (!selected) return; if (selected.size > 5 * 1024 * 1024) { setMessage('备份文件不能超过 5 MB。'); return } const text = await selected.text(); try { parseBackup(text); setPending(text) } catch (err) { setMessage(err instanceof Error ? err.message : '备份读取失败。') } e.target.value = '' }}/></div></div>
    {pending && <div className="import-confirm" role="dialog" aria-label="恢复学习备份"><h3>恢复这份学习备份？</h3><p>导入后会替换当前学院学习档案。建议先导出当前备份。</p><div className="button-row"><button className="primary-button" onClick={() => { try { restoreLearning(pending); setPending(null); setMessage('学习备份已恢复。') } catch { setMessage('恢复失败，原有档案未改动。') } }}>确认恢复</button><button className="secondary-button" onClick={() => setPending(null)}>取消</button></div></div>}
    {message && <p role="status" className="save-notice">{message}</p>}
    {tab === 'goals' && <div className="folio-scroll study-goals"><DailyGoal detailed/></div>}<div className="study-stats">{[['累计练习', profile.records.length, '次'], ['已掌握词汇', stats.mastered, '词'], ['待巩固词汇', stats.review, '词'], ['累计正确率', stats.accuracy, '%']].map(([name, value, unit]) => <div className="white-card" key={name}><small>{name}</small><strong>{value}<em>{unit}</em></strong></div>)}</div>
    <div className="study-toolbar"><div className="tab-group"><button className={tab === 'records' ? 'active' : ''} onClick={() => setTab('records')}>练习记录</button><button className={tab === 'words' ? 'active' : ''} onClick={() => setTab('words')}>单词记忆</button><button className={tab === 'goals' ? 'active' : ''} onClick={() => setTab('goals')}>自定义目标</button></div><label>每日目标 <select value={profile.goal} onChange={e => setDailyGoal(Number(e.target.value))}>{[...new Set([8, 15, 30, 50, profile.goal])].sort((a, b) => a - b).map(n => <option key={n} value={n}>{n} 词</option>)}</select></label></div>
    {tab === 'goals' ? null : tab === 'records' ? <div className="white-card table-card">{profile.records.length ? <table><thead><tr><th>练习内容</th><th>类型</th><th>正确 / 总数</th><th>学习时长</th><th>获得星能</th><th>完成时间</th></tr></thead><tbody>{profile.records.map(r => <tr key={r.id}><td><b>{r.title}</b></td><td><span className={`record-kind ${r.kind}`}>{r.kind === 'vocabulary' ? '词汇战斗' : r.kind === 'reading' ? '雅思阅读' : r.kind === 'sentence' ? '句子战斗' : r.kind === 'listening' ? '听力战斗' : r.kind === 'exam' ? '雅思试炼' : r.kind === 'writing' ? '学术写作' : r.kind === 'speaking' ? '口语思路 / 录音' : '打字试炼'}</span></td><td>{r.total ? `${r.correct} / ${r.total}` : '自评练习'}</td><td>{Math.floor(r.duration / 60)} 分 {r.duration % 60} 秒</td><td>+{r.xp}</td><td>{new Date(r.date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td></tr>)}</tbody></table> : <div className="empty-state"><Icon name="chart" size={42}/><h2>你的第一段冒险，正等待开始</h2><p>完成词汇战斗、打字试炼或提交阅读练习后，记录会出现在这里。</p></div>}</div> : <div className="white-card table-card"><div className="word-table-heading"><p>连续三次无提示答对，记为“已掌握”。看过答案的练习会继续安排复习。</p><button className="primary-button" onClick={onReview} disabled={!stats.review}>开始错词复习 <Icon name="arrow" size={16}/></button></div>{stats.seen ? <table><thead><tr><th>单词</th><th>中文释义</th><th>练习次数</th><th>连续记住</th><th>记忆状态</th></tr></thead><tbody>{allStudyWords(profile).filter(w => profile.words[w.id]).map(w => { const state = profile.words[w.id]; return <tr key={w.id}><td className="english-word">{w.word}</td><td>{w.meaning}</td><td>{state.attempts}</td><td>{state.streak} 次</td><td><span className={`word-status ${state.streak >= 3 ? 'mastered' : ''}`}>{state.streak >= 3 ? '已掌握' : '待巩固'}</span></td></tr> })}</tbody></table> : <div className="empty-state">完成一场词汇战斗，即可开启你的词汇档案。</div>}</div>}
  </section>
}

export function SpiritsPage() { return <SpiritSanctuary/> }
