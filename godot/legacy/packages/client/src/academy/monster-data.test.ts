import { expect, it } from 'vitest'
import { MONSTER_IDS, MONSTERS, monsterForEncounter } from './monster-data'
it('uses a coherent four-monster set and introduces a small crystal creature before tougher silhouettes', () => {
  expect(MONSTER_IDS).toHaveLength(4)
  expect(new Set(MONSTER_IDS.map(id => MONSTERS[id].image)).size).toBe(4)
  expect(monsterForEncounter('beginner', 'vocabulary', 'arrival')).toBe('crystal')
  expect(monsterForEncounter('environment', 'vocabulary')).toBe('thorn')
  expect(monsterForEncounter('human', 'listening', 'archive')).toBe('tide')
  expect(monsterForEncounter('beginner', 'sentence', 'tide')).toBe('gargoyle')
})
