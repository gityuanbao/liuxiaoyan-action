import type { LearningProfile, LearningRecord } from './learning-core'
import { EXPEDITION, RUNE_IDS, RUNE_COSTS, type RuneId } from './expedition-data'
import { freshGrowth } from './growth-core'
import { earnedSeals } from './trial-core'
export interface ExpeditionProgress { clears: Record<string, { stars: number; date: string }>; runes: Partial<Record<RuneId, number>>; equipped?: RuneId; claims: string[] }
export const emptyExpedition = (): ExpeditionProgress => ({ clears: {}, runes: {}, claims: [] })
export const stageUnlocked = (p: LearningProfile, id: string) => { const index = EXPEDITION.findIndex(s => s.id === id); return index >= 0 && (index === 0 || !!p.expedition?.clears[EXPEDITION[index - 1].id]) }
export const activeRune = (p: LearningProfile) => { const id = p.expedition?.equipped; return id && p.expedition?.runes[id] ? { id, rank: p.expedition.runes[id]! } : undefined }
export function expeditionReward(p: LearningProfile, r: LearningRecord) {
  const stage = EXPEDITION.find(s => s.id === r.expedition?.stage)
  return stage && r.outcome === 'victory' && r.correct > 0 && r.kind === stage.lesson && stageUnlocked(p, stage.id) && !p.expedition?.clears[stage.id] ? stage.reward : 0
}
export function settleExpedition(p: LearningProfile, r: LearningRecord): LearningProfile {
  if (!r.expedition) return p
  const stage = EXPEDITION.find(s => s.id === r.expedition?.stage)
  if (!stage || !stageUnlocked(p, stage.id) || r.kind !== stage.lesson) throw new Error('请先完成前一段航路。')
  if (!Number.isInteger(r.expedition.hp) || r.expedition.hp < 0 || r.expedition.hp > 140) throw new Error('远征生命记录无效。')
  if (r.outcome !== 'victory' || r.correct <= 0) return p
  if (r.expedition.hp <= 0 || stage.seal && !(r.ultimates && r.ultimates > 0)) throw new Error('最后的封印还没有解除。')
  const coins = expeditionReward(p, r), e = p.expedition ?? emptyExpedition(), g = p.growth ?? freshGrowth(p)
  const accuracy = r.total ? r.correct / r.total : 0
  const stars = accuracy >= .95 && r.expedition.hp >= 80 ? 3 : accuracy >= .85 ? 2 : 1
  return { ...p, growth: { ...g, coins: g.coins + coins, earned: g.earned + coins }, expedition: { ...e, clears: { ...e.clears, [stage.id]: { stars: Math.max(stars, e.clears[stage.id]?.stars ?? 0), date: r.date } } } }
}
export function improveRune(p: LearningProfile, id: RuneId): LearningProfile {
  if (!RUNE_IDS.includes(id)) throw new Error('这枚星纹不存在。')
  const e = p.expedition ?? emptyExpedition(), rank = e.runes[id] ?? 0, g = p.growth ?? freshGrowth(p), cost = RUNE_COSTS[rank]
  if (rank >= 3) throw new Error('星纹已达到三级。')
  if (!Object.keys(e.clears).length) throw new Error('完成第一场远征后，便能刻印星纹。')
  if (g.coins < cost) throw new Error(`星砂不足，还需要 ${cost - g.coins}。`)
  return { ...p, growth: { ...g, coins: g.coins - cost, spent: g.spent + cost }, expedition: { ...e, runes: { ...e.runes, [id]: rank + 1 }, equipped: id } }
}
export function equipRune(p: LearningProfile, id?: RuneId): LearningProfile {
  const e = p.expedition ?? emptyExpedition()
  if (id && (!RUNE_IDS.includes(id) || !e.runes[id])) throw new Error('先刻印这枚星纹，再装备它。')
  return { ...p, expedition: { ...e, equipped: id } }
}
export const COMMISSIONS = [
  { id: 'route-3', name: '桥已亮起', detail: '完成月光桥三场远征', reward: 20, progress: (p: LearningProfile) => EXPEDITION.slice(0, 3).filter(s => p.expedition?.clears[s.id]).length, target: 3 },
  { id: 'route-6', name: '森林来信', detail: '完成前六场远征', reward: 30, progress: (p: LearningProfile) => EXPEDITION.slice(0, 6).filter(s => p.expedition?.clears[s.id]).length, target: 6 },
  { id: 'remember-5', name: '真正记住的名字', detail: '五个词连续三次无提示答对', reward: 25, progress: (p: LearningProfile) => Object.values(p.words).filter(w => w.streak >= 3).length, target: 5 },
  { id: 'listen-3', name: '声音的旅伴', detail: '赢得三场听力战斗', reward: 25, progress: (p: LearningProfile) => p.records.filter(r => r.kind === 'listening' && r.outcome === 'victory').length, target: 3 },
  { id: 'seals-4', name: '学术的四种声音', detail: '完成学术类听读写说四域印记', reward: 60, progress: (p: LearningProfile) => earnedSeals(p.trials).size, target: 4 },
  { id: 'route-12', name: '把名字还给黎明', detail: '完成全部十二场远征', reward: 80, progress: (p: LearningProfile) => EXPEDITION.filter(s => p.expedition?.clears[s.id]).length, target: 12 },
]
export function claimCommission(p: LearningProfile, id: string): LearningProfile {
  const c = COMMISSIONS.find(c => c.id === id), e = p.expedition ?? emptyExpedition(), g = p.growth ?? freshGrowth(p)
  if (!c || c.progress(p) < c.target) throw new Error('这份委托还没有完成。')
  if (e.claims.includes(id)) return p
  return { ...p, expedition: { ...e, claims: [...e.claims, id] }, growth: { ...g, coins: g.coins + c.reward, earned: g.earned + c.reward } }
}
export function validExpedition(v: unknown): v is ExpeditionProgress {
  const e = v as ExpeditionProgress
  if (!e || typeof e !== 'object' || !e.clears || Array.isArray(e.clears) || typeof e.clears !== 'object' || !e.runes || Array.isArray(e.runes) || typeof e.runes !== 'object' || !Array.isArray(e.claims)) return false
  return Object.entries(e.clears).every(([id, c]) => EXPEDITION.some(s => s.id === id) && c && Number.isInteger(c.stars) && c.stars >= 1 && c.stars <= 3 && typeof c.date === 'string' && Number.isFinite(Date.parse(c.date))) && EXPEDITION.every((s, i) => !e.clears[s.id] || i === 0 || !!e.clears[EXPEDITION[i - 1].id]) && Object.entries(e.runes).every(([id, n]) => RUNE_IDS.includes(id as RuneId) && Number.isInteger(n) && n! >= 1 && n! <= 3) && (e.equipped === undefined || RUNE_IDS.includes(e.equipped) && !!e.runes[e.equipped]) && new Set(e.claims).size === e.claims.length && e.claims.every(id => COMMISSIONS.some(c => c.id === id))
}
