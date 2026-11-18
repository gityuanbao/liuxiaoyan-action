import type { ReactNode } from 'react'
import type { LearningFeedback } from './learning-feedback'
export function LearningResponse({ feedback, correct, pendingXp, paused, instruction, children }: { children?: ReactNode; instruction?: string; feedback: LearningFeedback | null; correct: number; pendingXp: number; paused: boolean }) {
  return <div className={`learning-response ${feedback ? `response-${feedback.tone}` : 'response-ready'}`}>
    <div className="learning-ack" key={feedback?.id ?? 'ready'} role="status" aria-live="polite" aria-atomic="true"><span className="learning-ack-seal" aria-hidden="true">{feedback?.tone === 'guide' ? '◇' : feedback ? '✓' : '✧'}</span><div><strong>{feedback?.title ?? '每次拼对，都会成为你的力量'}</strong><span>{feedback?.detail ?? '先完整写出英文，再打出咒卡。'}</span></div></div>
    {children}<div className="learning-session"><span>本场答对 <b>{correct}</b></span><span>星能 <b>+{pendingXp}</b> <small>待结算</small></span><em>{paused ? '暂停时可以慢慢想。' : instruction ?? feedback?.next ?? '不必追求速度，先把名字拼对。'}</em></div>
  </div>
}
