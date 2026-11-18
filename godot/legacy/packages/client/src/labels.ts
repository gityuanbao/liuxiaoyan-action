import { AbilityId, type Difficulty } from '@typeduel/shared'
import type { PracticeMode } from './practice/engine'

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '初阶',
  medium: '中阶',
  hard: '高阶',
}

export const MODE_LABELS: Record<PracticeMode, string> = {
  free: '自由练习',
  timed: '限时挑战',
  accuracy: '精准挑战',
  'sudden-death': '极限挑战',
  marathon: '耐力挑战',
  bot: '精灵对战',
}

export const ABILITY_LABELS: Record<AbilityId, string> = {
  [AbilityId.SURGE]: '雷霆增幅',
  [AbilityId.BLACKOUT]: '暗夜降临',
  [AbilityId.SCRAMBLE]: '文字扰乱',
  [AbilityId.PHANTOM_KEYS]: '幻影字符',
  [AbilityId.FREEZE]: '冰霜封印',
  [AbilityId.MIRROR]: '镜面护盾',
}

export const ABILITY_DESCRIPTIONS: Record<AbilityId, string> = {
  [AbilityId.SURGE]: '使自己的伤害提升至 1.5 倍，持续 5 秒。',
  [AbilityId.BLACKOUT]: '使对手的输入区域变暗，持续 3 秒。',
  [AbilityId.SCRAMBLE]: '扰乱对手即将输入的文字，持续 4 秒。',
  [AbilityId.PHANTOM_KEYS]: '在对手的输入区域加入幻影字符，持续 4 秒。',
  [AbilityId.FREEZE]: '冻结对手的输入光标，持续 2.5 秒。',
  [AbilityId.MIRROR]: '将受到伤害的 50% 反弹给对手，持续 5 秒。',
}

// Translate generated log messages at the display boundary; protocol values stay unchanged.
export function localizeCombatLog(text: string): string {
  const fixed: Record<string, string> = {
    'Match finished': '对战结束',
    'You win the match!': '你赢得了对战！',
    'You lose the match!': '本次对战失利，再接再厉！',
  }
  if (fixed[text]) return fixed[text]
  const round = text.match(/^Round (\d+) (finished|won!|lost)$/)
  if (round) return `第 ${round[1]} 回合${round[2] === 'finished' ? '结束' : round[2] === 'won!' ? '获胜！' : '失利'}`
  const action = text.match(/^(You|Opponent) (activated|used) (.+)$/)
  if (action) {
    const names: Record<string, AbilityId> = {
      Surge: AbilityId.SURGE,
      Blackout: AbilityId.BLACKOUT,
      Scramble: AbilityId.SCRAMBLE,
      'Phantom Keys': AbilityId.PHANTOM_KEYS,
      Freeze: AbilityId.FREEZE,
      Mirror: AbilityId.MIRROR,
    }
    const ability = names[action[3]]
    return `${action[1] === 'You' ? '你' : '对手'}${action[2] === 'activated' ? '激活' : '使用'}了${ability ? ABILITY_LABELS[ability] : action[3]}`
  }
  return text
}
