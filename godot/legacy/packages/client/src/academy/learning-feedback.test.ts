import { expect, it } from 'vitest'
import { castWord, createDuel } from './duel-engine'
import { correctionClue, learningResponse } from './learning-feedback'
it('distinguishes copying, independent recall and correction without claiming mastery or deposited rewards', () => {
  const previous = createDuel('relaxed'), state = castWord(previous, 'sun', 'sun')
  const context = { previous, state, word: 'sun', meaning: '太阳', independent: false, corrected: false }
  expect(learningResponse(context)).toMatchObject({ tone: 'success', title: '拼对了，咒语生效！' })
  expect(learningResponse({ ...context, independent: true })).toMatchObject({ tone: 'recall', title: '独立想起来了！' })
  const repaired = learningResponse({ ...context, corrected: true })
  expect(repaired.title).toBe('纠正成功！')
  expect(repaired.detail).not.toMatch(/已掌握|已入账/)
  expect(correctionClue('sua', 'sun', false)).toContain('第 3 个字母')
  expect(correctionClue('I see moon', 'I see the moon', true)).toContain('漏词')
})
it('celebrates actual combo, spirit response and full energy with actionable next steps', () => {
  let previous = createDuel('relaxed')
  for (let i = 0; i < 3; i++) previous = castWord(previous, 'sun', 'sun')
  const state = castWord(previous, 'sun', 'sun')
  expect(learningResponse({ previous, state, word: 'sun', meaning: '太阳', independent: false, corrected: false })).toMatchObject({ tone: 'combo', next: '能量已满，可以点击大招牌咏唱。' })
})
