import humanClips from './human-voice-data.json'
export const HUMAN_CLIPS = humanClips
export const humanClip = (word: string) => HUMAN_CLIPS.find(clip => clip.word === word)
export const OFFICIAL_AUDIO_SOURCES = [
  { title: 'IELTS 官方学术类样题', detail: '听力题型、在线作答、答案与原文；同时收录学术阅读、写作与口语样题。', label: '前往 IELTS 官方', url: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test' },
  { title: 'British Council 听力练习', detail: '官方听力练习与答案。按原网站提供的音频和题目一起训练。', label: '前往 British Council', url: 'https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/academic/listening' },
  { title: 'LibriVox 真人有声书', detail: '志愿者真人朗读，适合长篇泛听。不是雅思真题；录音的公有领域声明以美国法律为基础。', label: '寻找长篇朗读', url: 'https://librivox.org/' },
  { title: 'Tatoeba 句子录音', detail: '真人句子语料，可用于后续扩展。每位朗读者的音频许可各不相同，下载使用前需逐条核对。', label: '寻找句子录音', url: 'https://tatoeba.org/en/audio/index' },
] as const
export interface LocalAudio { id: string; title: string; filename: string; type: string; bytes: number; date: string; seconds: number; notes: string }
export const AUDIO_SHELF_KEY = 'starlanguage_audio_shelf_v1'
export function validateAudioFile(file: Pick<File, 'name' | 'size' | 'type'>) {
  if (file.size < 1 || file.size > 80 * 1024 * 1024) throw new Error('请选择不超过 80 MB 的音频文件。')
  if (!/\.(mp3|wav|ogg|m4a|mp4|webm|flac)$/i.test(file.name) || (file.type && !file.type.startsWith('audio/') && file.type !== 'video/mp4' && file.type !== 'video/webm')) throw new Error('支持 MP3、WAV、OGG、M4A、WebM、FLAC 音频。')
}
export function readAudioShelf(): LocalAudio[] {
  const value = JSON.parse(localStorage.getItem(AUDIO_SHELF_KEY) ?? '[]')
  if (!Array.isArray(value) || value.length > 20 || new Set(value.map((item: any) => item?.id)).size !== value.length || value.some((item: any) => !item || typeof item.id !== 'string' || !/^library:[\w-]+$/.test(item.id) || typeof item.title !== 'string' || item.title.length > 120 || typeof item.filename !== 'string' || typeof item.type !== 'string' || typeof item.notes !== 'string' || item.notes.length > 10000 || !Number.isFinite(Date.parse(item.date)) || !Number.isFinite(item.bytes) || item.bytes <= 0 || item.bytes > 80 * 1024 * 1024 || !Number.isFinite(item.seconds) || item.seconds <= 0 || item.seconds > 10800)) throw new Error('本地音频目录无法读取，请保留浏览器数据。')
  return value
}
export function writeAudioShelf(value: LocalAudio[]) { localStorage.setItem(AUDIO_SHELF_KEY, JSON.stringify(value)) }
