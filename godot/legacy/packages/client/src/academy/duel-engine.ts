import type { MonsterId } from './monster-data'
import type { RuneId } from './expedition-data'
import { SPELL_CARDS, type PreparedSpell } from './spell-cards'
export interface EncounterRules { monster?: MonsterId; hp?: number; elite?: boolean; rune?: { id: RuneId; rank: number } }
import { TACTICS, spiritEvery } from './battle-identity'
import type { AvatarId } from './character-data'
import { CHARACTER_SKILLS, SPIRIT_SKILLS, type SpiritId } from './combat-skills'
export type DuelDifficulty = 'relaxed' | 'normal' | 'hard'
export const DUEL_RULES = {
  relaxed: { label: '初遇', botInterval: 14000, botDamage: 9 },
  normal: { label: '切磋', botInterval: 9500, botDamage: 12 },
  hard: { label: '挑战', botInterval: 6500, botDamage: 14 },
} as const
export interface DuelState {
  encounter?: EncounterRules; enemyMaxHp?: number;
  ultimateSeal: boolean; heroRank: number; spiritRank: number; tacticUsed: boolean; focusReady: boolean;
  playerHp: number; botHp: number; combo: number; hits: number; mistakes: number;
  dealt: number; elapsed: number; nextBotAt: number; botAttacks: number;
  outcome: 'victory' | 'defeat' | null; difficulty: DuelDifficulty;
  avatar: AvatarId; companion: SpiritId; energy: number; shield: number; normalHits: number;
  ultimateUses: number; burnTicks: number; reactionReady: boolean;
  preparedSpell: PreparedSpell | null;
  last: { actor: 'player' | 'bot'; damage: number; burst: boolean; id: number; skill?: string; tactic?: boolean; ultimate?: boolean; energyGain?: number; energySpent?: number; spell?: PreparedSpell; passive?: string; warded?: boolean; heal?: number; shield?: number; absorbed?: number; spirit?: string; burn?: number } | null;
}
export const MAX_HP = 140
export const MAX_ENERGY = 100
export const MAX_SHIELD = 40
export function canPrepareSpell(state: DuelState, spell: PreparedSpell): boolean {
  return !state.outcome && state.energy >= SPELL_CARDS[spell].cost && (spell !== 'ward' || state.shield < MAX_SHIELD)
}
// Preparing a card is free. Only a correctly typed normal spell spends its energy.
export function prepareSpell(state: DuelState, spell: PreparedSpell | null): DuelState {
  if (state.outcome) return state
  if (!spell || state.preparedSpell === spell) return { ...state, preparedSpell: null }
  return canPrepareSpell(state, spell) ? { ...state, preparedSpell: spell } : state
}
function validatePreparedSpell(state: DuelState): DuelState {
  return state.preparedSpell && !canPrepareSpell(state, state.preparedSpell) ? { ...state, preparedSpell: null } : state
}
export function createDuel(difficulty: DuelDifficulty, avatar: AvatarId = 'mage', companion: SpiritId = 'moon', heroRank = 1, spiritRank = 1, ultimateSeal = false, encounter?: EncounterRules): DuelState {
  const enemyMaxHp = Math.max(30, Math.min(500, Math.floor(encounter?.hp ?? MAX_HP)))
  return { encounter, enemyMaxHp, ultimateSeal, heroRank: Math.max(1, Math.min(3, Math.floor(heroRank) || 1)), spiritRank: Math.max(1, Math.min(3, Math.floor(spiritRank) || 1)), tacticUsed: false, focusReady: false, preparedSpell: null, playerHp: MAX_HP, botHp: enemyMaxHp, combo: 0, hits: 0, mistakes: 0, dealt: 0, elapsed: 0, nextBotAt: DUEL_RULES[difficulty].botInterval, botAttacks: 0, outcome: null, difficulty, avatar, companion, energy: 0, shield: encounter?.rune?.id === 'ward' ? Math.min(MAX_SHIELD, encounter.rune.rank * 8) : 0, normalHits: 0, ultimateUses: 0, burnTicks: 0, reactionReady: false, last: null }
}
export function normalizeSentence(text: string): string {
  return (text.normalize('NFKC').toLowerCase().replace(/[‘’]/g, "'").match(/[a-z]+(?:'[a-z]+)?|[0-9]+/g) ?? []).join(' ')
}
function miss(state: DuelState): DuelState { return { ...state, combo: 0, mistakes: state.mistakes + 1, reactionReady: state.avatar === 'alchemist' || state.reactionReady } }
export function castWord(state: DuelState, typed: string, expected: string, kind: 'word' | 'sentence' = 'word'): DuelState {
  if (state.outcome || !typed.trim()) return state
  const matched = kind === 'sentence' ? normalizeSentence(typed) === normalizeSentence(expected) && !!normalizeSentence(expected) : typed.trim().toLowerCase() === expected.toLowerCase()
  if (!matched) return miss(state)
  const combo = state.combo + 1, normalHits = state.normalHits + 1, burst = combo % 4 === 0
  const base = kind === 'sentence' ? 6 + Math.min(24, normalizeSentence(expected).split(' ').length * 2) : 6 + Math.floor(expected.length / 2)
  const prepared = state.preparedSpell && canPrepareSpell(state, state.preparedSpell) ? state.preparedSpell : null
  const card = prepared ? SPELL_CARDS[prepared] : null, energySpent = card?.cost ?? 0
  let power = base + Math.min(combo, 5) + (burst ? 12 : 0) + (card?.damage ?? 0), energy = state.energy - energySpent + 20, heal = 0, shield = state.shield + (card?.shield ?? 0)
  const rune = state.encounter?.rune
  if (rune?.id === 'dawn') power += rune.rank * 2
  if (rune?.id === 'ward') shield += rune.rank
  if (rune?.id === 'insight') energy += rune.rank * 3
  if (state.encounter?.monster === 'gargoyle' && !burst) power = Math.max(1, power - 3)
  if (state.encounter?.monster === 'crystal' && burst) power += 6
  const rank = state.heroRank - 1
  if (state.avatar === 'mage') energy += 4 + rank * 4
  if (state.avatar === 'knight') shield += 3 + rank * 2
  if (state.avatar === 'ranger' && combo >= 3) power += 3 + rank * 2
  if (state.avatar === 'scholar' && kind === 'sentence') power += 4 + rank * 4
  if (state.avatar === 'bard' && normalHits % 3 === 0) heal += 6 + rank * 4
  if (state.avatar === 'alchemist' && state.reactionReady) power += 6 + rank * 4
  if (state.focusReady) power += state.avatar === 'scholar' ? kind === 'sentence' ? 16 : 4 : 6
  const spirit = SPIRIT_SKILLS[state.companion]
  const proc = normalHits % spiritEvery(state.companion, state.spiritRank) === 0
  if (proc) {
    if (state.companion === 'moon') energy += 8 + (state.spiritRank - 1) * 4
    if (state.companion === 'leaf') heal += 8 + (state.spiritRank - 1) * 4
    if (state.companion === 'spark') power += 6 + (state.spiritRank - 1) * 4
    if (state.companion === 'sun') shield += 10 + (state.spiritRank - 1) * 5
  }
  const warded = state.ultimateSeal && state.ultimateUses === 0 && power >= state.botHp
  const damage = Math.min(Math.max(0, state.botHp - (state.ultimateSeal && state.ultimateUses === 0 ? 1 : 0)), power), botHp = state.botHp - damage, playerHp = Math.min(MAX_HP, state.playerHp + heal)
  shield = Math.min(MAX_SHIELD, shield)
  return { ...state, preparedSpell: null, botHp, playerHp, shield, energy: Math.min(MAX_ENERGY, energy), combo, normalHits, focusReady: false, nextBotAt: state.nextBotAt + (proc && state.companion === 'moon' && state.spiritRank >= 3 ? 800 : 0), hits: state.hits + 1, reactionReady: false, dealt: state.dealt + damage, outcome: botHp === 0 ? 'victory' : null, last: { actor: 'player', damage, burst, warded, spell: prepared ?? undefined, skill: card?.name, energySpent, id: (state.last?.id ?? 0) + 1, energyGain: Math.min(MAX_ENERGY, energy) - (state.energy - energySpent), passive: state.avatar === 'mage' || state.avatar === 'knight' || (state.avatar === 'ranger' && combo >= 3) || (state.avatar === 'scholar' && kind === 'sentence') || (state.avatar === 'bard' && normalHits % 3 === 0) || (state.avatar === 'alchemist' && state.reactionReady) ? CHARACTER_SKILLS[state.avatar].passive : undefined, heal: playerHp - state.playerHp, shield: shield - state.shield, spirit: proc ? spirit.name : undefined } }
}
// The engine owns the chant: callers cannot substitute a shorter expected sentence.
export function castUltimate(state: DuelState, typed: string): DuelState {
  if (state.outcome || state.energy < MAX_ENERGY || !typed.trim()) return state
  const skill = CHARACTER_SKILLS[state.avatar]
  if (normalizeSentence(typed) !== normalizeSentence(skill.chant)) return miss(state)
  const damage = Math.min(state.botHp, skill.damage), botHp = state.botHp - damage
  const playerHp = state.avatar === 'bard' ? Math.min(MAX_HP, state.playerHp + 24) : state.playerHp
  const shield = state.avatar === 'knight' ? Math.min(MAX_SHIELD, state.shield + 24) : state.shield
  return { ...state, preparedSpell: null, playerHp, botHp, shield, energy: state.avatar === 'scholar' ? 20 : 0, hits: state.hits + 1, combo: state.combo + 1, ultimateUses: state.ultimateUses + 1, dealt: state.dealt + damage, nextBotAt: state.nextBotAt + (state.avatar === 'ranger' ? 5000 : 0), burnTicks: state.avatar === 'alchemist' ? 2 : state.burnTicks, outcome: botHp === 0 ? 'victory' : null, last: { actor: 'player', damage, burst: false, id: (state.last?.id ?? 0) + 1, skill: skill.ultimate, ultimate: true, heal: playerHp - state.playerHp, shield: shield - state.shield } }
}
// Only active play time is supplied; resolve periodic effects in order and stop at death.
export function advanceDuel(state: DuelState, delta: number): DuelState {
  if (state.outcome || !Number.isFinite(delta) || delta <= 0) return state
  const elapsed = state.elapsed + delta
  let next = { ...state, elapsed }
  while (next.elapsed >= next.nextBotAt && !next.outcome) {
    let burn = 0
    if (next.burnTicks > 0) {
      const damage = Math.min(Math.max(0, next.botHp - (next.ultimateSeal && next.ultimateUses === 0 ? 1 : 0)), 10 + (next.heroRank - 1) * 3)
      burn = damage
      next = { ...next, botHp: next.botHp - damage, dealt: next.dealt + damage, burnTicks: next.burnTicks - 1, last: { actor: 'player', damage, burst: false, skill: '炎星灼烧', id: (next.last?.id ?? 0) + 1 } }
      if (next.botHp === 0) { next.outcome = 'victory'; break }
    }
    const intent = enemyIntent(next)
    const absorbed = Math.min(next.shield, intent.damage), damage = Math.min(next.playerHp, intent.damage - absorbed)
    next = { ...next, playerHp: next.playerHp - damage, shield: next.shield - absorbed, botAttacks: next.botAttacks + 1, energy: Math.max(0, next.energy - intent.drain), nextBotAt: next.nextBotAt + intent.interval, last: { actor: 'bot', damage, burst: false, absorbed, burn, skill: next.encounter?.monster ? intent.name : undefined, id: (next.last?.id ?? 0) + 1 } }
    if (next.playerHp === 0) next.outcome = 'defeat'
  }
  return validatePreparedSpell(next)
}

// A tactic is earned by spelling, once per duel; it cannot deal an untyped finishing hit.
export function castTactic(state: DuelState): DuelState {
  if (state.outcome || state.tacticUsed || state.normalHits < 3 || (state.avatar === 'mage' && state.energy >= MAX_ENERGY)) return state
  const skill = TACTICS[state.avatar]
  const playerHp = state.avatar === 'bard' ? Math.min(MAX_HP, state.playerHp + 26) : state.playerHp
  const shield = state.avatar === 'knight' ? Math.min(MAX_SHIELD, state.shield + 22) : state.shield
  const energy = state.avatar === 'mage' ? Math.min(MAX_ENERGY, state.energy + 40) : state.energy
  return validatePreparedSpell({ ...state, playerHp, shield, energy, tacticUsed: true, focusReady: ['ranger','scholar'].includes(state.avatar), reactionReady: state.avatar === 'alchemist' || state.reactionReady, burnTicks: state.avatar === 'alchemist' ? Math.max(2, state.burnTicks) : state.burnTicks, nextBotAt: state.nextBotAt + (state.avatar === 'ranger' ? 4000 : state.avatar === 'knight' ? 1200 : 0), last: { id: (state.last?.id ?? 0) + 1, actor: 'player', damage: 0, burst: false, tactic: true, skill: skill.name, heal: playerHp - state.playerHp, shield: shield - state.shield, energyGain: energy - state.energy } })
}

// A telegraphed action is derived from the same state used to resolve it.
export function enemyIntent(state: DuelState) {
  const rule = DUEL_RULES[state.difficulty], monster = state.encounter?.monster
  const third = (state.botAttacks + 1) % 3 === 0, second = (state.botAttacks + 1) % 2 === 0
  const enraged = monster === 'gargoyle' && state.botHp <= (state.enemyMaxHp ?? MAX_HP) / 2
  const damage = rule.botDamage + (state.encounter?.elite ? 3 : 0) + (monster === 'crystal' && third ? 5 : monster === 'thorn' && third ? 8 : enraged ? 4 : 0)
  return { damage, drain: monster === 'tide' && second ? 12 : 0, interval: Math.round(rule.botInterval * (enraged ? .85 : 1)),
    name: monster === 'crystal' && third ? '晶核重击' : monster === 'thorn' && third ? '古根重砸' : monster === 'tide' && second ? '潮汐抽能' : enraged ? '狂暴石翼' : '雾蚀冲击',
    counter: monster === 'crystal' ? '每第三击为重击；四连击额外击碎晶核' : monster === 'thorn' ? '每第三击重砸；护盾或延缓战技可应对' : monster === 'tide' ? '每第二击抽走12能量；及时咏唱' : monster === 'gargoyle' ? '石甲减伤3，四连击穿甲；半血后狂暴' : '护盾优先抵挡' }
}
