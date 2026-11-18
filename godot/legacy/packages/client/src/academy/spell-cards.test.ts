import { describe, expect, it } from 'vitest'
import { advanceDuel, canPrepareSpell, castTactic, castUltimate, castWord, createDuel, MAX_SHIELD, prepareSpell } from './duel-engine'
import { CHARACTER_SKILLS } from './combat-skills'

const battle = () => ({ ...createDuel('normal', 'ranger', 'moon', 1, 1, false, { hp: 500 }), energy: 60 })
describe('prepared spelling cards', () => {
  it('prepares, swaps and cancels without damage, cost, or an earned hit', () => {
    const initial = battle(), armed = prepareSpell(initial, 'surge')
    expect(armed).toMatchObject({ energy: 60, botHp: 500, hits: 0, preparedSpell: 'surge', last: null })
    expect(prepareSpell(armed, 'ward').preparedSpell).toBe('ward')
    expect(prepareSpell(armed, 'surge').preparedSpell).toBeNull()
    expect(prepareSpell(armed, null).preparedSpell).toBeNull()
    expect(prepareSpell({ ...initial, energy: 29 }, 'surge').preparedSpell).toBeNull()
  })
  it('keeps the prepared card on a miss and spends once on the next correct word', () => {
    const armed = prepareSpell(battle(), 'surge'), missed = castWord(armed, 'climat', 'climate')
    expect(missed).toMatchObject({ energy: 60, botHp: 500, preparedSpell: 'surge', mistakes: 1 })
    const normal = castWord(battle(), 'climate', 'climate'), hit = castWord(missed, 'climate', 'climate')
    expect(hit.last?.damage).toBe(normal.last!.damage + 12)
    expect(hit).toMatchObject({ energy: 50, preparedSpell: null, hits: 1, last: { spell: 'surge', energySpent: 30 } })
    const following = castWord(hit, 'climate', 'climate')
    expect(following.last?.spell).toBeUndefined()
    expect(following.last?.energySpent).toBe(0)
  })
  it('requires existing energy before the hit and grants a capped ward only on correct sentences', () => {
    const initial = { ...battle(), energy: 20, shield: 35 }, armed = prepareSpell(initial, 'ward')
    const sentence = 'We protect the natural habitat.'
    expect(castWord(armed, 'We protect habitat.', sentence, 'sentence')).toMatchObject({ shield: 35, energy: 20, preparedSpell: 'ward' })
    expect(castWord(armed, sentence, sentence, 'sentence')).toMatchObject({ shield: MAX_SHIELD, energy: 20, preparedSpell: null, last: { shield: 5, energySpent: 20 } })
    expect(canPrepareSpell({ ...initial, shield: MAX_SHIELD }, 'ward')).toBe(false)
    // An unaffordable/stale preparation cannot spend the energy earned by this answer.
    const stale = castWord({ ...battle(), energy: 0, preparedSpell: 'surge' }, 'sun', 'sun')
    expect(stale).toMatchObject({ energy: 20, preparedSpell: null, last: { energySpent: 0 } })
  })
  it('clears a preparation when enemy drain removes its energy or a tactic fills the shield', () => {
    const tidal = prepareSpell({ ...battle(), encounter: { monster: 'tide' as const }, botAttacks: 1, energy: 30 }, 'surge')
    expect(advanceDuel(tidal, tidal.nextBotAt)).toMatchObject({ energy: 18, preparedSpell: null })
    const knight = prepareSpell({ ...createDuel('relaxed', 'knight'), normalHits: 3, energy: 20, shield: 30 }, 'ward')
    expect(castTactic(knight)).toMatchObject({ shield: MAX_SHIELD, preparedSpell: null })
  })
  it('preserves long-sentence seals and blocks card actions after the battle ends', () => {
    const sealed = { ...battle(), ultimateSeal: true, botHp: 5 }
    const hit = castWord(prepareSpell(sealed, 'surge'), 'sun', 'sun')
    expect(hit).toMatchObject({ botHp: 1, outcome: null, last: { warded: true } })
    const ultimate = castUltimate({ ...hit, energy: 100, preparedSpell: 'ward' }, CHARACTER_SKILLS.ranger.chant)
    expect(ultimate).toMatchObject({ botHp: 0, outcome: 'victory', preparedSpell: null })
    expect(prepareSpell(ultimate, 'ward')).toBe(ultimate)
    expect(castWord(ultimate, 'sun', 'sun')).toBe(ultimate)
  })
})
