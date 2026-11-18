import { AVATAR_IDS, type AvatarId } from './character-data'
import type { SpiritId } from './combat-skills'
import type { LearningProfile, LearningRecord } from './learning-core'
export interface Bond { rank: number; xp: number }
export interface Growth { coins: number; earned: number; spent: number; settled: string[]; heroes: Partial<Record<AvatarId, Bond>>; spirits: Partial<Record<SpiritId, Bond>> }
export const SPIRIT_IDS: SpiritId[] = ['moon', 'leaf', 'spark', 'sun']
export const RANK_NAMES = ['初契', '共鸣', '觉醒']
export const heroBond = (p: LearningProfile, id: AvatarId): Bond => p.growth?.heroes[id] ?? { rank: 1, xp: 0 }
export const spiritBond = (p: LearningProfile, id: SpiritId): Bond => p.growth?.spirits[id] ?? { rank: 1, xp: 0 }
export const freshGrowth = (p: LearningProfile): Growth => ({ coins: 0, earned: 0, spent: 0, settled: p.records.map(r => r.id), heroes: {}, spirits: {} })
export function practiceReward(r: Pick<LearningRecord, 'kind' | 'xp' | 'correct' | 'words' | 'outcome'>) {
  const independent = new Set(r.words?.filter(w => w.correct && !w.hinted).map(w => w.id)).size
  const selfPractice = ['writing', 'speaking'].includes(r.kind) && r.xp > 0
  const coins = Math.min(20, Math.floor(r.correct) * 2) + (r.correct > 0 && r.outcome === 'victory' ? 10 : 0) + Math.min(10, independent) + (selfPractice ? 12 : 0)
  return { coins, bond: coins ? Math.max(1, Math.min(12, Math.floor(r.correct) + (selfPractice ? 6 : 0))) : 0 }
}
export function awardPractice(p: LearningProfile, r: LearningRecord): Growth {
  const g = p.growth ?? freshGrowth(p)
  if (g.settled.includes(r.id)) return g
  const reward = practiceReward(r), avatar = r.avatar ?? p.avatar ?? 'mage'
  const companion = r.companion ?? (SPIRIT_IDS.includes(p.companion as SpiritId) ? p.companion as SpiritId : 'moon')
  const hero = heroBond(p, avatar), spirit = spiritBond(p, companion)
  return { ...g, coins: g.coins + reward.coins, earned: g.earned + reward.coins, settled: [...g.settled, r.id], heroes: { ...g.heroes, [avatar]: { ...hero, xp: hero.xp + reward.bond } }, spirits: { ...g.spirits, [companion]: { ...spirit, xp: spirit.xp + reward.bond } } }
}
export const nextUpgrade = (kind: 'hero' | 'spirit', rank: number) => rank >= 3 ? null : kind === 'hero' ? { cost: rank === 1 ? 30 : 70, xp: rank === 1 ? 20 : 60 } : { cost: rank === 1 ? 25 : 60, xp: rank === 1 ? 12 : 36 }
export function upgradeBond(p: LearningProfile, kind: 'hero' | 'spirit', id: string): LearningProfile {
  if (!(kind === 'hero' ? AVATAR_IDS.includes(id as AvatarId) : SPIRIT_IDS.includes(id as SpiritId))) throw new Error('找不到这位同行者。')
  const g = p.growth ?? freshGrowth(p), key = kind === 'hero' ? 'heroes' : 'spirits'
  const bond = (g[key] as Record<string, Bond>)[id] ?? { rank: 1, xp: 0 }, next = nextUpgrade(kind, bond.rank)
  if (!next) throw new Error('已达到觉醒阶。')
  if (bond.xp < next.xp) throw new Error(`熟练度达到 ${next.xp} 后才能进阶。`)
  if (g.coins < next.cost) throw new Error(`星砂不足，需要 ${next.cost} 星砂。完成练习后再来。`)
  return { ...p, growth: { ...g, coins: g.coins - next.cost, spent: g.spent + next.cost, [key]: { ...g[key], [id]: { ...bond, rank: bond.rank + 1 } } } }
}
export function validGrowth(value: unknown): value is Growth {
  const g = value as Growth, integer = (n: unknown) => Number.isSafeInteger(n) && Number(n) >= 0
  const bonds = (v: unknown, ids: string[]) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.entries(v).every(([id, b]) => ids.includes(id) && b && integer(b.xp) && integer(b.rank) && b.rank >= 1 && b.rank <= 3)
  return !!g && [g.coins, g.earned, g.spent].every(integer) && g.coins === g.earned - g.spent && Array.isArray(g.settled) && g.settled.length <= 50000 && g.settled.every(id => typeof id === 'string' && id.length > 0 && id.length <= 300) && new Set(g.settled).size === g.settled.length && bonds(g.heroes, AVATAR_IDS) && bonds(g.spirits, SPIRIT_IDS)
}
