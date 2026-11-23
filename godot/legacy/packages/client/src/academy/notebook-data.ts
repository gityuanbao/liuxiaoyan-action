import { ARCHIVED_WORD_IDS, WORDS, type StudyWord } from './words'
export interface Notebook { saved: string[]; notes: Record<string, string>; custom: StudyWord[]; customBook?: { name: string; ids: string[] }; customBookLocal?: boolean }
export const emptyNotebook = (): Notebook => ({ saved: [], notes: {}, custom: [] })
const rows = `mitigate|缓解；减轻|Green spaces can mitigate the effects of urban heat.|绿地可以缓解城市高温的影响。
resilience|韧性；恢复能力|A diverse ecosystem has greater resilience to change.|多样化的生态系统应对变化的恢复力更强。
substantial|大量的；显著的|The project requires substantial investment.|该项目需要大量投资。
fluctuate|波动|The number of visitors tends to fluctuate throughout the year.|访客数量在一年中往往会波动。
predominantly|主要地|The programme is predominantly funded by public money.|该项目主要由公共资金资助。
implication|影响；可能的后果|The findings have important implications for public policy.|这些发现对公共政策有重要影响。
assumption|假设；想当然的判断|The study challenges a common assumption about learning.|这项研究挑战了关于学习的一种常见假设。
empirical|基于观察或实验的|The argument needs empirical evidence.|这一论点需要观察或实验得出的证据。
disparity|差异；不平等|There is a marked disparity between the two regions.|两个地区之间存在明显差异。
allocate|分配|Schools should allocate resources according to need.|学校应根据需要分配资源。
viable|可行的|Public transport offers a viable alternative to driving.|公共交通提供了驾车以外的可行选择。
incentive|激励；奖励|A financial incentive may encourage people to save energy.|经济激励可能鼓励人们节能。
nevertheless|然而；尽管如此|The plan is costly; nevertheless, it may bring lasting benefits.|这个计划成本高，但可能带来长期收益。
whereas|然而；相比之下|Rail use increased, whereas car use declined.|铁路使用量上升，而汽车使用量下降。
proportion|比例|The proportion of people cycling rose steadily.|骑自行车的人口比例稳步上升。
coherent|连贯的；有条理的|A coherent argument connects each claim with supporting evidence.|连贯的论证将每个主张与支持证据联系起来。`
export const ACADEMIC_WORDS: StudyWord[] = rows.split('\n').map(row => { const [word, meaning, example, translation] = row.split('|'); return { id: `academic-${word}`, word, meaning, example, translation, pack: 'academic' } })
export function allStudyWords(profile: { notebook?: Notebook }): StudyWord[] { return [...WORDS, ...ACADEMIC_WORDS, ...(profile.notebook?.custom ?? [])] }
export function validateNotebook(value: unknown): value is Notebook {
  const book = value as Notebook
  if (!book || !Array.isArray(book.saved) || book.saved.length > 1000 || new Set(book.saved).size !== book.saved.length || !Array.isArray(book.custom) || book.custom.length > 1300 || !book.notes || typeof book.notes !== 'object' || Array.isArray(book.notes)) return false
  if (book.customBookLocal !== undefined && typeof book.customBookLocal !== 'boolean') return false
  const known = new Set([...ARCHIVED_WORD_IDS, ...[...WORDS, ...ACADEMIC_WORDS].map(w => w.id)])
  for (const w of book.custom) {
    if (!w || typeof w.id !== 'string' || !/^custom:[a-z0-9-]{8,60}$/.test(w.id) || known.has(w.id) || w.pack !== 'custom' || typeof w.word !== 'string' || !/^[a-zA-Z]+(?:[-' ][a-zA-Z]+)*$/.test(w.word) || w.word.length > 40 || typeof w.meaning !== 'string' || !w.meaning.trim() || w.meaning.length > 200 || typeof w.example !== 'string' || w.example.length > 800 || typeof w.translation !== 'string' || w.translation.length > 800) return false
    known.add(w.id)
  }
  if (book.customBook !== undefined) {
    const meta = book.customBook
    if (!meta || typeof meta.name !== 'string' || !meta.name.trim() || meta.name.length > 16 ||
      !Array.isArray(meta.ids) || !meta.ids.length || meta.ids.length > 200 || new Set(meta.ids).size !== meta.ids.length) return false
    const customIds = new Set(book.custom.map(word => word.id))
    if (!meta.ids.every(id => customIds.has(id))) return false
  }
  return book.saved.every(id => known.has(id)) && Object.entries(book.notes).every(([id, note]) => known.has(id) && typeof note === 'string' && note.length <= 2000)
}
