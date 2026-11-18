import type { MonsterId } from './monster-data'
import type { DuelState } from './duel-engine'
import type { AvatarId } from './character-data'
export function ArcaneEffects({ cue, avatar, paused, monster = 'crystal' }: { monster?: MonsterId; cue: DuelState['last']; avatar: AvatarId; paused: boolean }) {
  if (!cue || paused) return null
  const support = cue.tactic, enemy = cue.actor === 'bot'
  return <div key={cue.id} className={`arcane-fx ${enemy ? `fx-creature-${monster}` : `fx-${avatar}`} ${enemy ? 'fx-enemy' : 'fx-player'} ${support ? 'fx-support' : ''} ${cue.ultimate ? 'fx-ultimate' : cue.burst ? 'fx-combo' : ''} ${cue.absorbed ? 'fx-blocked' : ''} ${cue.spell ? `fx-${cue.spell}` : ''}`} data-effect-event={cue.id} aria-hidden="true">
    <div className="fx-cast-circle"><i/><i/><span>{avatar === 'bard' ? '♪' : avatar === 'scholar' ? '✧' : '✦'}</span></div>
    {!support && <><div className="fx-spell-stream">{[0, 1, 2].map(n => <i key={n} style={{ '--ray': n } as React.CSSProperties}/>)}</div><div className="fx-strike"><i className="fx-shockwave"/><i className="fx-shockwave second"/><div className="fx-impact-core"/>{Array.from({ length: cue.ultimate ? 18 : 10 }, (_, n) => <i className="fx-ember" key={n} style={{ '--angle': `${n * (cue.ultimate ? 20 : 36)}deg`, '--distance': `${42 + n % 4 * 16}px`, '--delay': `${280 + n % 3 * 22}ms` } as React.CSSProperties}/>)}</div></>}
    {(support || cue.spirit || cue.spell === 'ward') && <div className={`fx-boon ${cue.spirit ? 'has-spirit' : ''}`}><i/><i/><span>{cue.heal ? '✚' : cue.shield ? '◇' : '✦'}</span></div>}
  </div>
}
