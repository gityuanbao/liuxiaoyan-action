import { describe, expect, it } from 'vitest'
import { advanceDuel, castWord, createDuel, MAX_HP } from './duel-engine'

describe('spelling duel', () => {
  it('accepts sentence punctuation and case differences but rejects missing, reordered and misspelled words', () => {
    const state = createDuel('relaxed')
    const expected = 'We protect the natural habitat.'
    const hit = castWord(state, ' WE   PROTECT the natural habitat! ', expected, 'sentence')
    expect(hit.hits).toBe(1); expect(hit.botHp).toBeGreaterThan(0)
    for (const answer of ['We protect habitat', 'We natural protect the habitat', 'We protect the natural habitt', '!!!']) expect(castWord(state, answer, expected, 'sentence').hits).toBe(0)
  })
  it('caps long-sentence damage and preserves contractions', () => {
    const sentence = Array(100).fill('word').join(' ')
    expect(castWord(createDuel('relaxed'), sentence, sentence, 'sentence').last?.damage).toBe(31)
    expect(castWord(createDuel('relaxed'), 'Its a word.', "It's a word.", 'sentence').hits).toBe(0)
  })
  it('one correct word deals damage without defeating the opponent', () => {
    const hit = castWord(createDuel('normal'), ' HABITAT ', 'habitat')
    expect(hit.botHp).toBeGreaterThan(0); expect(hit.botHp).toBeLessThan(MAX_HP); expect(hit.outcome).toBeNull(); expect(hit.hits).toBe(1)
  })
  it('a wrong spelling cannot damage the opponent and breaks the combo', () => {
    const state = castWord(createDuel('normal'), 'habitat', 'habitat')
    const miss = castWord(state, 'habitt', 'habitat')
    expect(miss.botHp).toBe(state.botHp); expect(miss.combo).toBe(0); expect(miss.mistakes).toBe(1)
  })
  it('eight short words do not automatically finish a battle', () => {
    let state = createDuel('normal')
    for (let i = 0; i < 8; i++) state = castWord(state, 'cat', 'cat')
    expect(state.outcome).toBeNull(); expect(state.botHp).toBeGreaterThan(0)
    while (!state.outcome) state = castWord(state, 'cat', 'cat')
    expect(state.botHp).toBe(0); expect(state.outcome).toBe('victory'); expect(castWord(state, 'cat', 'cat')).toBe(state)
  })
  it('bot attacks on the selected interval, and defeat follows zero HP', () => {
    let state = advanceDuel(createDuel('hard'), 6499)
    expect(state.playerHp).toBe(MAX_HP)
    state = advanceDuel(state, 1); expect(state.playerHp).toBe(MAX_HP - 14)
    state = advanceDuel(state, 6500 * 9); expect(state.playerHp).toBe(0); expect(state.outcome).toBe('defeat')
    expect(advanceDuel(state, 6500)).toBe(state)
  })
  it('the fourth consecutive spelling triggers a stronger spell', () => {
    let state = createDuel('relaxed')
    for (let i = 0; i < 4; i++) state = castWord(state, 'habitat', 'habitat')
    expect(state.last?.burst).toBe(true); expect(state.last?.damage).toBe(25)
  })
})
