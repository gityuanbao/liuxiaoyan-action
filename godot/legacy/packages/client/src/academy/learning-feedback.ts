import type { DuelState } from './duel-engine'
import { normalizeSentence } from './duel-engine'
export interface LearningFeedback { id: number; tone: 'success' | 'recall' | 'recovery' | 'combo' | 'guide' | 'ultimate'; title: string; detail: string; next: string }
export function correctionClue(typed: string, expected: string, sentence: boolean) {
  if (sentence) {
    const a = normalizeSentence(typed).split(' '), b = normalizeSentence(expected).split(' ')
    const i = b.findIndex((w, n) => w !== a[n])
    return a.length !== b.length ? `检查漏词或多词，再按顺序连起来。` : `从第 ${Math.max(1, i + 1)} 个词附近检查拼写和词序。`
  }
  const a = typed.trim().toLowerCase(), b = expected.toLowerCase()
  const i = [...b].findIndex((letter, n) => letter !== a[n])
  return a.length !== b.length ? `检查字母数量，再试一次。` : `从第 ${Math.max(1, i + 1)} 个字母附近检查一下。`
}
export function learningResponse({ state, previous, word, meaning, independent, corrected, ultimate = false }: { state: DuelState; previous: DuelState; word: string; meaning: string; independent: boolean; corrected: boolean; ultimate?: boolean }): LearningFeedback {
  const burst = !!state.last?.burst, charged = previous.energy < 100 && state.energy >= 100
  const title = ultimate ? '完整长句，咏唱成功！' : corrected ? '纠正成功！' : burst ? '四连击，稳稳命中！' : charged ? '大招准备好了！' : independent ? '独立想起来了！' : state.normalHits % 5 === 0 ? `已经准确回应 ${state.normalHits} 次！` : '拼对了，咒语生效！'
  const detail = ultimate ? '你完整写出了专属长句。' : `刚刚答对：${word} · ${meaning.replace(/[。！？.!?]+$/, '')}${corrected ? '。这次修好了刚才的拼写。' : independent ? '。这次没有看答案。' : '。继续跟着练，慢慢熟悉它。'}`
  const next = state.outcome === 'victory' ? '遭遇完成，正在结算成长。' : state.last?.warded ? '最后的封印需要完整长句。' : charged ? '能量已满，可以点击大招牌咏唱。' : state.last?.spirit ? `${state.last.spirit}已回应你的准确拼写。` : state.normalHits === 3 && !state.tacticUsed ? '角色战技已解锁，可以择机使用。' : `再连续命中 ${4 - state.combo % 4} 次，触发星耀爆发。`
  return { id: state.hits + state.mistakes, tone: ultimate ? 'ultimate' : corrected ? 'recovery' : burst ? 'combo' : independent ? 'recall' : 'success', title, detail, next }
}
