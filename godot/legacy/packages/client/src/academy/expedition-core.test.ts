import { describe, expect, it } from 'vitest'
import { emptyProfile, parseBackup, recordResult, type LearningRecord } from './learning-core'
import { EXPEDITION } from './expedition-data'
import { activeRune, claimCommission, emptyExpedition, improveRune, stageUnlocked, validExpedition } from './expedition-core'
import { advanceDuel, castUltimate, castWord, createDuel, enemyIntent } from './duel-engine'
import { CHARACTER_SKILLS } from './combat-skills'
import { WORDS } from './words'
import { humanClip } from './audio-library-data'
const date = '2026-10-16T12:00:00.000Z'
const win = (index: number, id = `stage-${index}`): LearningRecord => ({ id, date, title: EXPEDITION[index].name, kind: EXPEDITION[index].lesson, correct: 8, total: 8, duration: 60, xp: 60, outcome: 'victory', ultimates: EXPEDITION[index].seal ? 1 : 0, expedition: { stage: EXPEDITION[index].id, hp: 120 } })
describe('a finite, persistent expedition', () => {
  it('locks future stages and atomically saves first-clear, ordinary rewards and best stars', () => {
    const p = emptyProfile()
    expect(stageUnlocked(p, EXPEDITION[0].id)).toBe(true)
    expect(stageUnlocked(p, EXPEDITION[1].id)).toBe(false)
    expect(() => recordResult(p, win(1))).toThrow()
    const next = recordResult(p, win(0))
    expect(next.growth).toMatchObject({ coins: 41, earned: 41, spent: 0 })
    expect(next.expedition?.clears[EXPEDITION[0].id].stars).toBe(3)
    expect(recordResult(next, win(0))).toBe(next)
    const replay = recordResult(next, { ...win(0, 'again'), total: 20, expedition: { stage: EXPEDITION[0].id, hp: 10 } })
    expect(replay.growth?.coins).toBe(67) // Practice remains repeatable, first-clear does not.
    expect(replay.expedition?.clears[EXPEDITION[0].id].stars).toBe(3)
    const failed = recordResult(p, { ...win(0), outcome: 'defeat' })
    expect(failed.expedition).toBeUndefined()
    expect(stageUnlocked(failed, EXPEDITION[1].id)).toBe(false)
  })
  it('plays all twelve authored stages through the real engine with valid pools and a final chant', () => {
    let p = emptyProfile()
    for (const [i, stage] of EXPEDITION.entries()) {
      const pool = WORDS.filter(w => stage.pack === 'human' ? !!humanClip(w.word) : w.pack === stage.pack).filter(w => !stage.maxLength || w.word.length <= stage.maxLength)
      expect(pool.length).toBeGreaterThan(0)
      let d = createDuel(stage.difficulty, 'mage', 'moon', 1, 1, !!stage.seal, { monster: stage.monster, hp: stage.hp, elite: stage.boss })
      for (let n = 0; n < 80 && !d.outcome; n++) {
        const word = pool[n % pool.length], text = stage.lesson === 'sentence' ? word.example : word.word
        d = castWord(d, text, text, stage.lesson === 'sentence' ? 'sentence' : 'word')
        if (stage.seal && d.botHp === 1 && d.energy === 100) d = castUltimate(d, CHARACTER_SKILLS.mage.chant)
        d = advanceDuel(d, 900)
      }
      expect(d.outcome, stage.id).toBe('victory')
      if (stage.seal) expect(d.ultimateUses).toBeGreaterThan(0)
      p = recordResult(p, { ...win(i), correct: d.hits, total: d.hits + d.mistakes, ultimates: d.ultimateUses, expedition: { stage: stage.id, hp: d.playerHp } })
      expect(stageUnlocked(p, stage.id)).toBe(true)
      expect(parseBackup(JSON.stringify(p))).toEqual(p)
    }
    expect(Object.keys(p.expedition!.clears)).toHaveLength(12)
    const before = p.growth!.coins
    p = claimCommission(p, 'route-12')
    expect(p.growth!.coins).toBe(before + 80)
    expect(claimCommission(p, 'route-12')).toBe(p)
  })
  it('keeps old saves, validates new progress, and charges rune upgrades exactly once per level', () => {
    expect(parseBackup(JSON.stringify(emptyProfile())).expedition).toBeUndefined()
    let p = recordResult(emptyProfile(), win(0))
    p = improveRune(p, 'ward')
    expect(p.growth).toMatchObject({ coins: 21, earned: 41, spent: 20 })
    expect(activeRune(p)).toEqual({ id: 'ward', rank: 1 })
    expect(() => improveRune(p, 'ward')).toThrow('星砂不足')
    expect(() => claimCommission(p, 'seals-4')).toThrow()
    expect(parseBackup(JSON.stringify(p))).toEqual(p)
    expect(validExpedition({ ...emptyExpedition(), runes: { dawn: 4 } })).toBe(false)
    expect(validExpedition({ ...emptyExpedition(), equipped: 'ward' })).toBe(false)
    expect(validExpedition({ ...emptyExpedition(), clears: { 'tower-3': { stars: 3, date } } })).toBe(false)
    expect(() => parseBackup(JSON.stringify({ ...p, expedition: { ...p.expedition, claims: ['unknown'] } }))).toThrow()
  })
})
describe('monster counterplay and meaningful growth', () => {
  it('uses the displayed intent for crystal, thorn heavy strikes and tide energy drain', () => {
    for (const monster of ['crystal', 'thorn', 'tide', 'gargoyle'] as const) {
      let d = createDuel('relaxed', 'mage', 'moon', 1, 1, false, { monster })
      for (let n = 0; n < 3; n++) {
        d = { ...d, energy: 60 }
        const intent = enemyIntent(d), hp = d.playerHp
        d = advanceDuel(d, d.nextBotAt - d.elapsed)
        expect(d.playerHp).toBe(hp - intent.damage)
        expect(d.energy).toBe(60 - intent.drain)
      }
      if (monster === 'thorn') expect(d.last?.damage).toBe(17)
      if (monster === 'crystal') expect(d.last?.damage).toBe(14)
    }
  })
  it('gargoyle armor yields to a four-hit burst and gets a real half-health enrage', () => {
    const plain = createDuel('relaxed'), armor = createDuel('relaxed', 'mage', 'moon', 1, 1, false, { monster: 'gargoyle' })
    expect(castWord(armor, 'sun', 'sun').last?.damage).toBe(castWord(plain, 'sun', 'sun').last!.damage - 3)
    const burst = { ...armor, combo: 3 }
    expect(castWord(burst, 'sun', 'sun').last?.damage).toBe(castWord({ ...plain, combo: 3 }, 'sun', 'sun').last?.damage)
    const rage = { ...armor, botHp: 70 }
    expect(enemyIntent(rage)).toMatchObject({ name: '狂暴石翼', damage: 13, interval: 11900 })
  })
  it('each equipped rune changes its promised stat and wrong spelling cannot farm resources', () => {
    const baseline = castWord(createDuel('relaxed'), 'sun', 'sun')
    for (const id of ['dawn', 'ward', 'insight'] as const) {
      const start = createDuel('relaxed', 'mage', 'moon', 1, 1, false, { rune: { id, rank: 2 } }), d = castWord(start, 'sun', 'sun')
      if (id === 'dawn') expect(d.last!.damage).toBe(baseline.last!.damage + 4)
      if (id === 'ward') expect(d.shield).toBe(18)
      if (id === 'insight') expect(d.energy).toBe(baseline.energy + 6)
      const wrong = castWord(start, 'wrong', 'sun')
      expect(wrong).toMatchObject({ energy: start.energy, shield: start.shield, botHp: start.botHp, last: null })
    }
  })
})
