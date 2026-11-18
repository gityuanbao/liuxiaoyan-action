import { useState } from 'react'
import { profileStats, type LearningProfile, type LearningRecord } from './learning-core'
import { allStudyWords } from './notebook-data'
import { collectNotebookWords } from './learning-store'
import { battleDebrief } from './adventure-guidance'

export function BattleDebrief({ attempts, profile, saved, onReview }: { attempts: NonNullable<LearningRecord['words']>; profile: LearningProfile; saved: boolean; onReview: () => void }) {
  const [notice, setNotice] = useState('')
  const rows = battleDebrief(attempts), words = allStudyWords(profile)
  const weak = rows.filter(r => r.reason !== 'recalled'), independent = rows.length - weak.length
  const hasReview = profileStats(profile).review > 0
  if (!rows.length) return null
  function collect() { try { collectNotebookWords(weak.map(r => r.id)); setNotice('本场待巩固词已加入词之书。') } catch { setNotice('收藏未保存，请检查浏览器存储后重试。') } }
  return <section className="battle-debrief" aria-label="本场词汇复盘"><div className="debrief-heading"><div><h2>{weak.length ? '把薄弱的咒语，带回词之书' : '这一次，你独立想起了每一道咒语'}</h2><p>{rows.length} 个不同词条 · 独立命中 {independent} 个 · 待巩固 {weak.length} 个</p></div><span className="debrief-bookmark" aria-hidden="true">✧</span></div>
    {weak.length ? <><ul>{weak.slice(0, 6).map(row => { const word = words.find(w => w.id === row.id); return <li key={row.id}><span><b>{word?.word ?? row.id}</b><small>{word?.meaning}</small></span><em>{row.reason === 'missed' ? '本场错拼过' : '跟打或提示'}</em></li> })}</ul>{weak.length > 6 && <p>还有 {weak.length - 6} 个待巩固词；收藏时会一并加入。</p>}<div className="debrief-actions"><button className="gal-button ghost" disabled={!saved} onClick={collect}>收藏本场待巩固词</button><button className="gal-link" disabled={!saved || !hasReview} onClick={onReview}>{hasReview ? '去错词复习' : '暂无待巩固词'}</button></div></> : <p>独立命中是本场的表现；连续三次无提示答对，才记为已掌握。</p>}
    <small>跟打和提示练习不计为独立掌握；复习会使用你的全部待巩固词。</small>{notice && <p className="debrief-notice" role="status">{notice}</p>}
  </section>
}
