import type { DuelState } from './duel-engine'
import type { StoryEncounter } from './story-encounters'
import { TACTICS } from './battle-identity'
import { CHARACTERS } from './character-data'
const VOICES: Record<string, { start: string; pressure: string; crack: string; victory: string; memory: string }> = {
  arrival: { start: '桥的另一端……是谁在叫我的名字？', pressure: '别再靠近。雾里没有你要找的路。', crack: '树木，河流……我想起来了。桥通向森林！', victory: '谢谢你。去找艾琳吧，她还在等那本日志。', memory: '通往森林的路标' },
  archive: { start: '这些声音重叠在一起，我听不清航路的名字。', pressure: '潮声太响了。你的回应会被吞没。', crack: '我听见了……是港口的坐标。再回应一次。', victory: '回声终于有了方向。把坐标带给澪。', memory: '被打散的航路坐标' },
  tide: { start: '零散的词语打不开这道门。把它们连接起来。', pressure: '你的句子，还承受得住下一阵风吗？', crack: '那些意思正在连成一条路。封印松动了。', victory: '门后的星灯看见你了。继续向上走吧。', memory: '高塔门上的星文' },
  constellation: { start: '学过的一切，都会像星光一样消失。', pressure: '放下法书吧。没有人记得完整的归途。', crack: '为什么……那些被遗忘的声音还在回应你？', victory: '原来文字真的能留下光。让星灯再亮一次吧。', memory: '星灯失去的名字' },
  'voice-seal': { start: '你们只有四枚印记，我却拥有整个长夜。', pressure: '外海的风会吹散你说过的每一句话。', crack: '那些声音……正沿着新航路传回来。', victory: '黎明已经到来。带着你的伙伴，去看看外海吧。', memory: '通往外海的誓言' },
}
export function battleStoryLine(story: StoryEncounter & { chapter: string }, state: DuelState) {
  const voice = VOICES[story.chapter] ?? VOICES.arrival
  const player = CHARACTERS[state.avatar].name, enemy = story.enemy ?? '雾中的声音'
  const progress = state.outcome === 'victory' ? '记忆已找回' : state.botHp <= 70 ? '记忆正在复原' : '追索记忆'
  if (state.outcome === 'victory') return { speaker: enemy, side: 'right', text: voice.victory, progress, memory: voice.memory }
  if (state.outcome === 'defeat') return { speaker: player, side: 'left', text: '先退到安全的地方。记下刚才卡住的词，我们一起回来。', progress, memory: voice.memory }
  if (state.ultimateSeal && state.ultimateUses === 0 && state.botHp <= 1) return { speaker: player, side: 'left', text: '雾已经散了，只剩名字上的长句封印。能量已满，把我的咒语完整地写出来，我们一起点亮星灯。', progress: '最后的长句封印', memory: voice.memory }
  if (state.mistakes && state.combo === 0) return { speaker: player, side: 'left', text: state.avatar === 'alchemist' ? '我把这个错误记进配方里了。修正它，下一击会更有力量。' : '别急着和雾抢时间。看清这个词，我会陪着你。', progress, memory: voice.memory }
  if (state.last?.tactic) return { speaker: player, side: 'left', text: `${TACTICS[state.avatar].name}已经展开。接下来的咒语，交给你。`, progress, memory: voice.memory }
  if (state.botHp <= 70) return { speaker: enemy, side: 'right', text: voice.crack, progress, memory: voice.memory }
  if (state.normalHits >= 3 && !state.tacticUsed) return { speaker: player, side: 'left', text: `三个印记齐了。我可以用${TACTICS[state.avatar].name}为你争取机会。`, progress, memory: voice.memory }
  return { speaker: enemy, side: 'right', text: state.botAttacks ? voice.pressure : voice.start, progress, memory: voice.memory }
}
