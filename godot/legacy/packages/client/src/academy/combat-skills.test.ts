import { describe, expect, it } from 'vitest'
import { CHARACTER_SKILLS, type SpiritId } from './combat-skills'
import { advanceDuel, castUltimate, castWord, createDuel, type DuelState } from './duel-engine'
import { AVATAR_IDS } from './character-data'
function hits(state: DuelState, count: number) { for (let i = 0; i < count; i++) state = castWord(state, 'cat', 'cat'); return state }
describe('character and spirit combat', () => {
  it('charges only on correct attacks and requires the entire owned chant', () => {
    const start = createDuel('relaxed')
    expect(castUltimate(start, CHARACTER_SKILLS.mage.chant)).toBe(start)
    const charged = hits(start, 4)
    expect(charged.energy).toBe(100)
    for (const wrong of ['When the night grows quiet', CHARACTER_SKILLS.knight.chant, CHARACTER_SKILLS.mage.chant.replace('quiet', 'quite')]) {
      const miss = castUltimate(charged, wrong)
      expect(miss).toMatchObject({ botHp: charged.botHp, energy: 100, ultimateUses: 0, combo: 0, mistakes: 1 })
    }
    const ultimate = castUltimate(charged, CHARACTER_SKILLS.mage.chant.toUpperCase().replace(/[,.]/g, ''))
    expect(ultimate).toMatchObject({ energy: 0, ultimateUses: 1, normalHits: 4, hits: 5 })
    expect(ultimate.last).toMatchObject({ ultimate: true, skill: '星河终章', damage: 60 })
    expect(castUltimate(ultimate, CHARACTER_SKILLS.mage.chant)).toBe(ultimate)
  })
  it('gives each character its stated normal-attack behavior', () => {
    expect(hits(createDuel('relaxed', 'mage'), 1).energy).toBe(24)
    const knight = hits(createDuel('normal', 'knight'), 3)
    expect(knight.shield).toBe(9)
    expect(advanceDuel(knight, 9500)).toMatchObject({ shield: 0, playerHp: 137 })
    expect(hits(createDuel('relaxed', 'ranger'), 3).dealt - hits(createDuel('relaxed', 'mage'), 3).dealt).toBe(3)
    const phrase = 'We learn together.'
    expect(castWord(createDuel('relaxed', 'scholar'), phrase, phrase, 'sentence').dealt - castWord(createDuel('relaxed'), phrase, phrase, 'sentence').dealt).toBe(4)
    expect(hits({ ...createDuel('relaxed', 'bard'), playerHp: 100 }, 3).playerHp).toBe(106)
    let alchemist = castWord(createDuel('relaxed', 'alchemist'), 'wrong', 'cat')
    alchemist = castWord(alchemist, 'wrong', 'cat')
    alchemist = castWord(alchemist, 'cat', 'cat')
    expect(alchemist.last?.damage).toBe(14)
    expect(castWord(alchemist, 'cat', 'cat').last?.damage).toBe(9)
  })
  it.each(['moon', 'leaf', 'spark', 'sun'] as SpiritId[])('%s supports correct normal attacks, with no proc on wrong spelling', spirit => {
    const count = spirit === 'moon' ? 3 : spirit === 'sun' ? 5 : 4
    let state = hits({ ...createDuel('relaxed', 'scholar', spirit), playerHp: 100 }, count - 1)
    const miss = castWord(state, 'wrong', 'cat')
    expect(miss.normalHits).toBe(count - 1)
    expect(miss.energy).toBe(state.energy)
    state = castWord(miss, 'cat', 'cat')
    expect(state.last?.spirit).toBeTruthy()
    if (spirit === 'moon') expect(state.energy).toBe(68)
    if (spirit === 'leaf') expect(state.playerHp).toBe(108)
    if (spirit === 'spark') expect(state.last?.damage).toBe(14)
    if (spirit === 'sun') expect(state.shield).toBe(10)
  })
  it.each(AVATAR_IDS)('%s ultimate applies its own damage and support effect', avatar => {
    const start = { ...createDuel('normal', avatar), energy: 100, playerHp: 100, shield: 30 }
    const state = castUltimate(start, CHARACTER_SKILLS[avatar].chant)
    expect(state.botHp).toBe(140 - CHARACTER_SKILLS[avatar].damage)
    expect(state.normalHits).toBe(0)
    expect(state.playerHp).toBe(avatar === 'bard' ? 124 : 100)
    expect(state.shield).toBe(avatar === 'knight' ? 40 : 30)
    expect(state.energy).toBe(avatar === 'scholar' ? 20 : 0)
    expect(state.nextBotAt).toBe(avatar === 'ranger' ? 14500 : 9500)
    expect(state.burnTicks).toBe(avatar === 'alchemist' ? 2 : 0)
  })
  it('caps healing and shields and delays the ranger opponent attack', () => {
    const bard = castUltimate({ ...createDuel('normal', 'bard'), energy: 100, playerHp: 139 }, CHARACTER_SKILLS.bard.chant)
    expect(bard.playerHp).toBe(140); expect(bard.last?.heal).toBe(1)
    const knight = hits({ ...createDuel('normal', 'knight', 'sun'), shield: 39 }, 5)
    expect(knight.shield).toBe(40)
    const ranger = castUltimate({ ...createDuel('normal', 'ranger'), energy: 100 }, CHARACTER_SKILLS.ranger.chant)
    expect(advanceDuel(ranger, 9500).botAttacks).toBe(0)
    expect(advanceDuel(ranger, 14500).botAttacks).toBe(1)
  })
  it('resolves exactly two burn ticks before attacks, and stops if burn defeats the bot', () => {
    const cast = castUltimate({ ...createDuel('normal', 'alchemist'), energy: 100 }, CHARACTER_SKILLS.alchemist.chant)
    const one = advanceDuel(cast, 9500)
    expect(one).toMatchObject({ botHp: 78, burnTicks: 1, botAttacks: 1 }); expect(one.last?.burn).toBe(10)
    const three = advanceDuel(one, 19000)
    expect(three).toMatchObject({ botHp: 68, burnTicks: 0, botAttacks: 3 })
    const death = advanceDuel({ ...cast, botHp: 8, playerHp: 1 }, 9500)
    expect(death).toMatchObject({ outcome: 'victory', botHp: 0, playerHp: 1, botAttacks: 0 })
    expect(advanceDuel(death, 100000)).toBe(death)
  })
})
