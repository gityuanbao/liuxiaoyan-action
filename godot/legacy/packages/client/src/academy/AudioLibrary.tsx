import { useEffect, useRef, useState } from 'react'
import { HUMAN_CLIPS, OFFICIAL_AUDIO_SOURCES, readAudioShelf, validateAudioFile, writeAudioShelf, type LocalAudio } from './audio-library-data'
import { getRecording, saveRecording } from './recording-store'
import { useGameStore } from '../store'

async function audioDuration(file: File) {
  const url = URL.createObjectURL(file), probe = new Audio(); probe.preload = 'metadata'
  try { return await new Promise<number>((resolve, reject) => {
    const finish = (error?: string) => { clearTimeout(timer); probe.onloadedmetadata = null; probe.onerror = null; if (error) reject(new Error(error)); else resolve(probe.duration) }
    const timer = setTimeout(() => finish('音频读取超时，请尝试 MP3 或 WAV 文件。'), 10000)
    probe.onloadedmetadata = () => finish(Number.isFinite(probe.duration) && probe.duration > 0 && probe.duration <= 10800 ? undefined : '请选择时长不超过 3 小时的完整音频。')
    probe.onerror = () => finish('浏览器无法播放这个文件，请转换成 MP3 或 WAV。'); probe.src = url
  }) } finally { probe.removeAttribute('src'); probe.load(); URL.revokeObjectURL(url) }
}
export function AudioLibrary({ onBattle }: { onBattle: () => void }) {
  const setScreen = useGameStore(s => s.setScreen), file = useRef<HTMLInputElement>(null), player = useRef<HTMLAudioElement>(null), ownedUrl = useRef('')
  const [tab, setTab] = useState<'human' | 'official' | 'local'>('human'), [clips, setClips] = useState<LocalAudio[]>([]), [selected, setSelected] = useState<LocalAudio | null>(null), [url, setUrl] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [notes, setNotes] = useState(''), [speed, setSpeed] = useState('1'), [loop, setLoop] = useState(false)
  const mounted = useRef(true), generation = useRef(0)
  const playing = useRef<HTMLAudioElement | null>(null)
  function playingAudio(element: HTMLAudioElement) { if (playing.current && playing.current !== element) playing.current.pause(); playing.current = element }
  function changeTab(next: typeof tab) { playing.current?.pause(); setTab(next) }
  useEffect(() => { mounted.current = true; try { setClips(readAudioShelf()) } catch (err) { setNotice((err as Error).message) } return () => { mounted.current = false; generation.current++; playing.current?.pause(); if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current) } }, [])
  useEffect(() => { if (player.current) player.current.playbackRate = Number(speed) }, [speed, url])
  useEffect(() => { player.current?.pause() }, [tab])
  async function open(clip: LocalAudio) {
    const ticket = ++generation.current
    try { player.current?.pause(); const blob = await getRecording(clip.id); if (!blob) throw new Error('这段录音不在当前浏览器，请重新导入原文件。'); if (!mounted.current || ticket !== generation.current) return; if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current); ownedUrl.current = URL.createObjectURL(blob); setUrl(ownedUrl.current); setSelected(clip); setNotes(clip.notes); setNotice('') }
    catch (err) { if (mounted.current) setNotice((err as Error).message) }
  }
  async function importFile(value: File) {
    setBusy(true); setNotice('正在检查音频…')
    try {
      validateAudioFile(value); const shelf = readAudioShelf()
      if (shelf.length >= 20 || shelf.reduce((sum, item) => sum + item.bytes, 0) + value.size > 300 * 1024 * 1024) throw new Error('本地图书馆最多 20 段、合计 300 MB 音频。')
      const seconds = await audioDuration(value), clip: LocalAudio = { id: `library:${crypto.randomUUID()}`, title: value.name.replace(/\.[^.]+$/, '').slice(0, 120), filename: value.name, type: value.type, bytes: value.size, date: new Date().toISOString(), seconds, notes: '' }
      await saveRecording(clip.id, value); writeAudioShelf([clip, ...shelf]); if (!mounted.current) return; setClips([clip, ...shelf]); await open(clip); setNotice('音频已导入，仅保存在此浏览器。可以回听并记录错词。')
    } catch (err) { if (mounted.current) setNotice(err instanceof Error ? err.message : '导入失败，请检查浏览器存储空间。') } finally { if (mounted.current) setBusy(false) }
  }
  return <section className="audio-library"><header className="audio-library-heading"><div><span>回声海港的藏声室</span><h1>声音图书馆</h1><p>听见真实的声音，让下一次回应更加准确。</p></div><button className="gal-button ghost" onClick={() => setScreen('listening')}>前往听力战斗</button></header>
    <div className="audio-library-tabs" role="group" aria-label="音频分类">{([['human', '真人发音包'], ['official', '官方样题与语料'], ['local', '我的音频']] as const).map(([id, name]) => <button key={id} aria-pressed={tab === id} className={tab === id ? 'selected' : ''} onClick={() => changeTab(id)}>{name}</button>)}</div>
    <div className="audio-library-body folio-scroll">{tab === 'human' && <><div className="voice-pack-banner"><div><span>人声原录 · 美式英语</span><h2>收集真实的单词回声</h2><p>首批 {HUMAN_CLIPS.length} 个可用录音，来自 Wikimedia Commons 的真人贡献者。完整听完，再在战斗里拼写攻击。答对后也会读出刚完成的英文；其他内置词句使用本地合成朗读。</p><button className="gal-button" onClick={onBattle}>携带真人语音包出战</button></div><img src="/art/optimized-v1/bard-4d5581eacd6d.webp" alt="潮音 · 澪"/></div><div className="human-clip-list">{HUMAN_CLIPS.map(clip => <article key={clip.word}><h3>{clip.word}</h3><audio controls preload="none" src={clip.file} aria-label={`${clip.word} 真人发音`} onPlay={e => playingAudio(e.currentTarget)}/><p>朗读：{clip.author}</p><a href={clip.page} target="_blank" rel="noreferrer">录音来源</a><a href={clip.licenseUrl} target="_blank" rel="noreferrer">{clip.license}</a></article>)}</div><p className="audio-source-note">以上录音保持原样分发。单词录音用于听写；既有例句使用合成朗读。<a href="/audio/human-v1/ATTRIBUTION.txt" target="_blank" rel="noreferrer">完整作者与许可清单</a></p></>}
    {tab === 'official' && <><p className="audio-source-note">这里是经过核对的官方公开样题与人声语料入口。官方样题不等于历年真题；题目、答案和录音请在原网站一起使用。</p><div className="audio-sources">{OFFICIAL_AUDIO_SOURCES.map(source => <article key={source.url}><h2>{source.title}</h2><p>{source.detail}</p><a className="gal-button ghost" href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></article>)}</div><p className="audio-source-note">如你有正版剑桥雅思或官方下载的个人练习音频，可进入“我的音频”本地导入。此处不公开复制第三方试卷或录音。<a href="https://www.britishcouncil.org/terms" target="_blank" rel="noreferrer">British Council 使用条款</a></p></>}
    {tab === 'local' && <><div className="local-audio-intro"><div><h2>把自己的练习带进旅途</h2><p>导入已有音频，调速、循环回听，写下错词和复盘。文件保存在本机，不上传服务器。</p></div><button className="gal-button" disabled={busy} onClick={() => file.current?.click()}>{busy ? '正在导入…' : '导入音频'}</button><input ref={file} hidden type="file" accept=".mp3,.wav,.ogg,.m4a,.mp4,.webm,.flac,audio/*" onChange={e => { const value = e.target.files?.[0]; e.target.value = ''; if (value) void importFile(value) }}/></div><div className="local-audio-layout"><div className="local-audio-shelf">{clips.length ? clips.map(clip => <button key={clip.id} className={selected?.id === clip.id ? 'selected' : ''} onClick={() => void open(clip)}><b>{clip.title}</b><small>{Math.floor(clip.seconds / 60)} 分 {Math.round(clip.seconds % 60)} 秒　{(clip.bytes / 1024 / 1024).toFixed(1)} MB</small></button>) : <p>书架还是空的。先导入一段你想练习的声音。</p>}</div><div className="local-audio-player">{selected ? <><h3>{selected.title}</h3><audio ref={player} onPlay={e => playingAudio(e.currentTarget)} controls src={url} loop={loop} preload="metadata" onError={() => setNotice('播放失败，请重新导入原始音频文件。')}/><div className="local-audio-options"><label>播放速度 <select aria-label="播放速度" value={speed} onChange={e => setSpeed(e.target.value)}>{['0.75', '1', '1.25', '1.5'].map(s => <option key={s} value={s}>{s} 倍</option>)}</select></label><label><input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)}/> 循环回听</label></div><label className="audio-note-label">听写、错词与复盘<textarea aria-label="音频复盘笔记" rows={7} maxLength={10000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="把没听懂的词、自己的听写和下次想注意的线索写下来。"/></label><button className="gal-button ghost" onClick={() => { try { const next = readAudioShelf().map(c => c.id === selected.id ? { ...c, notes } : c); writeAudioShelf(next); setClips(next); setSelected({ ...selected, notes }); setNotice('复盘笔记已保存。') } catch { setNotice('笔记未保存，请检查浏览器存储。') } }}>保存复盘笔记</button></> : <p>选择左侧音频后开始回听。</p>}</div></div><p className="audio-source-note">每段不超过 80 MB，最多 20 段、合计 300 MB。音频与复盘独立保存在此浏览器，不包含在旅途 JSON 备份中；请保留原文件。</p></>}
    {notice && <p className="audio-library-notice" role="status">{notice}</p>}</div>
  </section>
}
