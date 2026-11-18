import { practiceReward } from './growth-core'
import { useRef, useState } from 'react'
import { addLearningRecord } from './learning-store'
const READINGS = [
  { id: 'city-garden', title: '城市中的一片绿意', english: 'A Garden Above the City', paragraphs: [
    'On the roof of a small library, a group of residents created a garden. The project began with six wooden boxes and a collection of seeds donated by local families. The library did not charge visitors an entrance fee. Instead, everyone was invited to help with simple tasks such as watering plants and removing weeds.',
    'At first, the volunteers watered the garden every morning. They soon found that this routine used more water than necessary. A gardener suggested checking the soil before watering. When the soil was still wet, the volunteers waited. Later, they installed a tank to collect rainwater from the roof. This reduced their use of tap water, although the garden still needed extra water during dry weeks.',
    'The garden also became a meeting place. Older residents shared advice, while children kept notebooks about the plants. Some visitors enjoyed growing vegetables, but others came mainly to talk. The library recorded visitor numbers and found that more people used the roof after the garden opened. However, it did not measure whether visitors became healthier.',
    'The organisers want to add shaded seats next year. They have not yet decided how much the expansion will cost. Their main aim is to make the space comfortable for people who wish to stay longer, rather than to sell the vegetables they grow.'
  ], questions: [
    { prompt: '1. Visitors had to pay to enter the rooftop garden.', answer: 'FALSE', evidence: '第一段说明图书馆不收入场费，与题干相反。', tf: true },
    { prompt: '2. Collecting rainwater completely removed the need for extra water.', answer: 'FALSE', evidence: '第二段说明干旱周仍需要额外用水；completely 是关键。', tf: true },
    { prompt: '3. Garden visitors became healthier after the garden opened.', answer: 'NOT GIVEN', evidence: '第三段说明没有测量健康变化，无法判断访客是否更健康。', tf: true },
    { prompt: '4. Children recorded information about plants in ______. (ONE WORD ONLY)', answer: 'notebooks', evidence: '第三段：children kept notebooks about the plants。', tf: false },
    { prompt: '5. Next year, the organisers hope to add shaded ______. (ONE WORD ONLY)', answer: 'seats', evidence: '第四段：add shaded seats next year。', tf: false },
  ] },
  { id: 'quiet-coast', title: '海港里的安静实验', english: 'A Quieter Harbour', paragraphs: [
    'In a coastal town, the harbour authority started a trial to reduce noise near homes. During the trial, delivery boats were asked to travel more slowly within the inner harbour. The new rule applied between six in the evening and six the following morning. Boats entering from the open sea could continue at their usual speed until they reached the marked area.',
    'Researchers placed microphones at three locations beside the harbour. They collected recordings for two weeks before the trial and for two weeks after it began. The recordings showed lower average noise levels during the restricted hours. However, the researchers warned that wind and the number of visiting boats could also influence the results.',
    'Some boat operators worried that slower travel would delay deliveries. To address this concern, the authority allowed boats to reserve unloading spaces in advance. Operators reported fewer queues at the docks, which helped them keep their schedules. The authority did not publish a comparison of fuel costs.',
    'Residents were invited to send comments through a website. Many welcomed the quieter evenings, although a few said they had noticed little difference. Before making the rule permanent, the authority plans to repeat the study in winter, when weather conditions and harbour traffic may be different.'
  ], questions: [
    { prompt: '1. The speed restriction applied throughout the entire day.', answer: 'FALSE', evidence: '第一段限速只适用于晚上六点至次日早上六点。', tf: true },
    { prompt: '2. Researchers recognised that factors other than speed could affect noise.', answer: 'TRUE', evidence: '第二段提到风和船只数量也会影响结果。', tf: true },
    { prompt: '3. The trial reduced fuel costs for every boat operator.', answer: 'NOT GIVEN', evidence: '第三段没有公布燃料费用对比，不能由限速推断费用变化。', tf: true },
    { prompt: '4. Researchers used ______ to record harbour noise. (ONE WORD ONLY)', answer: 'microphones', evidence: '第二段：Researchers placed microphones at three locations。', tf: false },
    { prompt: '5. The authority will repeat its study in ______. (ONE WORD ONLY)', answer: 'winter', evidence: '第四段：repeat the study in winter。', tf: false },
  ] },
]
export function OriginalReading() {
  const [selected, setSelected] = useState(0), [answers, setAnswers] = useState<string[]>([])
  const [score, setScore] = useState<number | null>(null), [saved, setSaved] = useState(false), [message, setMessage] = useState('')
  const session = useRef({ id: crypto.randomUUID(), started: Date.now() })
  const reading = READINGS[selected]
  function choose(index: number) { setSelected(index); setAnswers([]); setScore(null); setSaved(false); setMessage(''); session.current = { id: crypto.randomUUID(), started: Date.now() } }
  function submit() {
    const correct = reading.questions.filter((q, i) => answers[i]?.trim().toUpperCase() === q.answer.toUpperCase()).length
    setScore(correct)
    try { addLearningRecord({ id: `original-reading:${session.current.id}`, kind: 'reading', title: `原创阅读 · ${reading.english}`, date: new Date().toISOString(), correct, total: reading.questions.length, duration: Math.max(1, Math.round((Date.now() - session.current.started) / 1000)), xp: 30 }); setSaved(true); setMessage(`阅读成绩已保存到冒险手记，获得 30 星能、${practiceReward({kind:'reading',correct,xp:30}).coins} 星砂。`) }
    catch { setMessage('成绩暂未保存，请点击重试保存。') }
  }
  return <section className="original-reading"><div className="reading-selector"><label>选择文章 <select aria-label="选择原创阅读" value={selected} onChange={e => choose(Number(e.target.value))}>{READINGS.map((r, i) => <option value={i} key={r.id}>{r.title}</option>)}</select></label><span>原创短篇 · 判断题与单词填空 · 非官方真题</span></div><div className="reading-columns"><article className="reading-passage"><span className="eyebrow">阅读秘境</span><h2>{reading.english}</h2>{reading.paragraphs.map((p, i) => <p key={i}><b>{String.fromCharCode(65 + i)}</b>{p}</p>)}</article><form className="reading-questions" onSubmit={e => { e.preventDefault(); if (!saved) submit() }}><h2>寻找藏在文字里的答案</h2><p>TRUE：与文章一致；FALSE：与文章相反；NOT GIVEN：文章未提供足够信息。填空仅填写一个单词。</p>{reading.questions.map((q, i) => <label key={i}>{q.prompt}{q.tf ? <select aria-label={`阅读答案 ${i + 1}`} value={answers[i] ?? ''} disabled={score !== null} onChange={e => setAnswers(a => Object.assign([...a], { [i]: e.target.value }))}><option value="">请选择</option>{['TRUE', 'FALSE', 'NOT GIVEN'].map(value => <option key={value}>{value}</option>)}</select> : <input aria-label={`阅读答案 ${i + 1}`} value={answers[i] ?? ''} disabled={score !== null} autoComplete="off" onChange={e => setAnswers(a => Object.assign([...a], { [i]: e.target.value }))}/>} {score !== null && <small className={answers[i]?.trim().toUpperCase() === q.answer.toUpperCase() ? 'answer-right' : 'answer-wrong'}>答案：{q.answer} · {q.evidence}</small>}</label>)}{score === null ? <button className="gal-button" disabled={reading.questions.some((_, i) => !answers[i]?.trim())}>提交阅读答案</button> : <div className="reading-result"><h3>本次答对 {score} / {reading.questions.length}</h3><p role="status">{message}</p>{!saved && <button className="gal-button">重试保存</button>}<button type="button" className="gal-button ghost" disabled={!saved} onClick={() => choose((selected + 1) % READINGS.length)}>探索下一篇</button></div>}</form></div></section>
}
