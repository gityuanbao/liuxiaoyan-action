import { expect, it } from 'vitest'
import { AVATAR_IDS } from './character-data'
import { advanceDuel, castTactic, castWord, castUltimate, createDuel } from './duel-engine'
import { CHARACTER_SKILLS } from './combat-skills'
import { SPIRIT_IDS } from './growth-core'
function ready(avatar: typeof AVATAR_IDS[number]) { let s = createDuel('normal', avatar); for (let i = 0; i < 3; i++) s = castWord(s, 'cat', 'cat'); return { ...s, playerHp: 80 } }
it.each(AVATAR_IDS)('%s earns one tactic through correct spelling, with a distinct effect', avatar => {
  const empty = createDuel('normal', avatar)
  expect(castTactic(empty)).toBe(empty)
  expect(castTactic(castWord(empty, 'wrong', 'cat'))).toMatchObject({ tacticUsed: false, normalHits: 0 })
  const before = ready(avatar), after = castTactic(before)
  expect(after.tacticUsed).toBe(true); expect(after.botHp).toBe(before.botHp)
  expect(castTactic(after)).toBe(after)
  expect(after.last).toMatchObject({ tactic: true, damage: 0 })
  if (avatar === 'mage') expect(after.energy).toBe(100)
  if (avatar === 'knight') { expect(after.shield).toBe(before.shield + 22); expect(after.nextBotAt).toBe(before.nextBotAt + 1200) }
  if (avatar === 'ranger') { expect(after.nextBotAt).toBe(before.nextBotAt + 4000); expect(castWord(after, 'cat', 'cat').last!.damage).toBe(castWord(before, 'cat', 'cat').last!.damage + 6) }
  if (avatar === 'scholar') expect(castWord(after, 'a little tree', 'a little tree', 'sentence').last!.damage).toBe(castWord(before, 'a little tree', 'a little tree', 'sentence').last!.damage + 16)
  if (avatar === 'bard') expect(after.playerHp).toBe(106)
  if (avatar === 'alchemist') expect(advanceDuel(after, 9500).last?.burn).toBe(10)
})
it('preserves complete ultimate chants and prevents post-result tactics', () => {
  const s = { ...ready('mage'), energy: 100 }
  expect(castUltimate(s, 'a short sentence').botHp).toBe(s.botHp)
  expect(castUltimate(s, CHARACTER_SKILLS.mage.chant).ultimateUses).toBe(1)
  const ended = { ...ready('ranger'), outcome: 'victory' as const }
  expect(castTactic(ended)).toBe(ended)
})
it('requires a fully typed ultimate to break a story seal after spelling weakens the enemy', () => {
  let s = createDuel('normal', 'mage', 'moon', 1, 1, true)
  for (let i=0;i<14;i++) s=castWord(s,'habitat','habitat')
  expect(s).toMatchObject({ botHp:1, outcome:null, energy:100 })
  expect(s.last?.warded).toBe(true)
  expect(castUltimate(s,'a short chant').botHp).toBe(1)
  const victory=castUltimate(s,CHARACTER_SKILLS.mage.chant)
  expect(victory).toMatchObject({ botHp:0, outcome:'victory', ultimateUses:1 })
})
it.each(SPIRIT_IDS)('awakens %s in its own support direction', id => {
  let s = { ...createDuel('normal', 'scholar', id, 1, 3), playerHp: 70 }
  for (let i = 0; i < (id === 'sun' ? 4 : 3); i++) s = castWord(s, 'cat', 'cat')
  expect(s.last?.spirit).toBeTruthy()
  if (id === 'moon') { expect(s.energy).toBe(76); expect(s.nextBotAt).toBe(10300) }
  if (id === 'leaf') expect(s.playerHp).toBe(86)
  if (id === 'spark') expect(s.last?.damage).toBe(24)
  if (id === 'sun') expect(s.shield).toBe(20)
})
it.each(AVATAR_IDS)('strengthens %s specialization instead of flat attack for everyone', avatar => {
  let base = { ...createDuel('normal', avatar, 'moon'), playerHp: 70 }, grown = { ...createDuel('normal', avatar, 'moon', 3), playerHp: 70 }
  if (avatar === 'alchemist') { base = castWord(base, 'wrong', 'cat'); grown = castWord(grown, 'wrong', 'cat') }
  for (let i = 0; i < (['ranger','bard'].includes(avatar) ? 3 : 1); i++) { base = castWord(base, 'a cat', 'a cat', 'sentence'); grown = castWord(grown, 'a cat', 'a cat', 'sentence') }
  if (avatar === 'mage') expect(grown.energy - base.energy).toBe(8)
  else if (avatar === 'knight') expect(grown.shield - base.shield).toBe(4)
  else if (avatar === 'bard') expect(grown.playerHp - base.playerHp).toBe(8)
  else expect(grown.dealt).toBeGreaterThan(base.dealt)
})
