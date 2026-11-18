import { enemyIntent, type DuelState } from './duel-engine'

export function CombatReadout({ state, paused, celebration }: { state: DuelState; paused: boolean; celebration?: string }) {
  const intent = enemyIntent(state)
  const remaining = Math.max(0, state.nextBotAt - state.elapsed)
  const progress = Math.max(0, Math.min(100, (1 - remaining / intent.interval) * 100))
  const lit = state.combo > 0 && state.combo % 4 === 0 ? 4 : state.combo % 4
  return <div className="combat-readout">
    <div className={`enemy-intent ${progress >= 75 ? 'intent-near' : ''}`}><div><span>{paused ? '敌方行动暂停' : progress >= 75 ? '小怪即将反击' : '小怪正在蓄势'}</span><b>{(remaining / 1000).toFixed(1)}<small> 秒</small></b></div><div className="enemy-intent-track" role="progressbar" aria-label="敌方攻击蓄势" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><i style={{ width: `${progress}%` }}/></div><small className="intent-damage">{state.encounter?.monster ? intent.name : '基础伤害'} {intent.damage}{intent.drain ? ` · 抽能 ${intent.drain}` : ' · 护盾优先'}</small></div>
    <div className="combo-runes" role="group" aria-label={`连击符文 ${lit} / 4`}>{celebration && <strong className="combo-celebration">{celebration}</strong>}<div className="combo-rune-slots" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <i className={i < lit ? 'lit' : ''} key={i}>✦</i>)}</div><span>{lit === 4 ? '星耀爆发已命中' : `再连续命中 ${4 - lit} 次，触发星耀爆发`}</span></div>
  </div>
}
