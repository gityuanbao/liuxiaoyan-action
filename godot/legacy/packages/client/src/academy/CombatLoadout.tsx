import { useState, type CSSProperties, type ReactNode } from 'react'
import { TACTICS, spiritEffect, spiritEvery, HERO_GROWTH } from './battle-identity'
import { CHARACTERS, type AvatarId } from './character-data'
import { CHARACTER_SKILLS, SPIRIT_SKILLS, type SpiritId } from './combat-skills'
import { SPIRITS } from './words'
import { canPrepareSpell, MAX_ENERGY, type DuelState } from './duel-engine'
import { SPELL_CARDS, type PreparedSpell } from './spell-cards'
import { SkillCardArt } from './SkillCardArt'
export function CombatPreview({ avatar, companion, heroRank = 1, spiritRank = 1 }: { avatar: AvatarId; companion: SpiritId; heroRank?: number; spiritRank?: number }) {
  const skill = CHARACTER_SKILLS[avatar], spirit = SPIRITS.find(s => s.id === companion)!
  return <div className="combat-preview"><div><b>{CHARACTERS[avatar].name} · {skill.passive}</b><p>{HERO_GROWTH[avatar][heroRank - 1]}</p><small>长句大招 · {skill.ultimate}：{skill.effect}</small></div><div><b>{spirit.name} · {SPIRIT_SKILLS[companion].name}</b><p>{spiritEffect(companion, spiritRank)}</p><small>战技：{TACTICS[avatar].name} · 三次普通命中后可用，每场一次。</small></div></div>
}
interface HandCardProps {
  id: string; index: number; type: string; name: string; icon: string; counter: string;
  rule: string; status: string; art: ReactNode; disabled?: boolean; selected?: boolean;
  ready?: boolean; played?: boolean; automatic?: boolean; label?: string;
  onClick?: () => void; onInspect: (id: string) => void; onLeave: () => void;
}
function HandCard(props: HandCardProps) {
  const content = <><span className="battle-card__header"><span>{props.type}</span><strong>{props.counter}</strong></span>
    <span className="battle-card__art">{props.art}<i aria-hidden="true">{props.icon}</i></span>
    <span className="battle-card__name">{props.name}</span><span className="battle-card__rule">{props.rule}</span>
    <span className="battle-card__status">{props.status}</span></>
  const position = props.index - 2
  const className = `battle-card battle-card--${props.id} ${props.selected ? 'is-selected' : ''} ${props.ready ? 'is-ready' : ''}`
  return <div className={`battle-hand__slot ${props.selected ? 'is-selected' : ''} ${props.played ? 'has-played' : ''}`} style={{ '--fan-x': position, '--fan-y': position * position, '--fan-z': props.index + 1 } as CSSProperties}
    onPointerEnter={() => props.onInspect(props.id)} onPointerLeave={props.onLeave} onFocus={() => props.onInspect(props.id)} onBlur={props.onLeave}
    tabIndex={props.disabled ? 0 : undefined}>
    {props.automatic ? <article className={className} aria-label={props.label} tabIndex={0} title={props.rule}>{content}</article>
      : <button type="button" className={className} aria-label={props.label ?? props.name} title={props.rule} disabled={props.disabled}
        aria-pressed={props.id === 'surge' || props.id === 'ward' || props.id === 'ultimate' ? !!props.selected : undefined} onClick={props.onClick}>{content}</button>}
  </div>
}
export function CombatActions({ state, disabled, chanting, onChant, onTactic, onPrepare }: { state: DuelState; disabled: boolean; chanting: boolean; onChant: () => void; onTactic?: () => void; onPrepare?: (spell: PreparedSpell | null) => void }) {
  const [inspected, setInspected] = useState<string | null>(null)
  const skill = CHARACTER_SKILLS[state.avatar], tactic = TACTICS[state.avatar], spirit = SPIRITS.find(s => s.id === state.companion)!
  const every = spiritEvery(state.companion, state.spiritRank), progress = state.normalHits % every
  const locked = disabled || !!state.outcome
  const chantLabel = chanting ? '返回普通攻击' : state.energy >= MAX_ENERGY ? `咏唱大招 · ${skill.ultimate}` : '积攒能量'
  const tacticLabel = state.tacticUsed ? '本场战技已释放' : `${tactic.name} · ${Math.min(3,state.normalHits)}/3`
  const tacticRule = { mage: '补充40能量', knight: '护盾+22，延缓反击', ranger: '延缓反击，下击强化', scholar: '强化下一句', bard: '回复26生命', alchemist: '灼烧2次' }[state.avatar]
  const tacticStatus = state.tacticUsed ? '本场已释放' : state.avatar === 'mage' && state.energy >= MAX_ENERGY ? '能量已满，先咏唱大招' : state.normalHits >= 3 ? '点击释放 · 每场一次' : '命中3次解锁'
  const prepared = state.preparedSpell ? SPELL_CARDS[state.preparedSpell] : null
  const details: Record<string, string> = {
    surge: `${SPELL_CARDS.surge.rule}命中才消耗30能量，错拼不扣除。`,
    ward: `${SPELL_CARDS.ward.rule}命中才消耗20能量，护盾上限40。`,
    tactic: `${tactic.name}：${tactic.effect}三次普通命中后可用，每场一次。`,
    spirit: `${spirit.name} · ${spiritEffect(state.companion, state.spiritRank)}。再命中 ${every - progress} 次触发。`,
    ultimate: `${skill.ultimate}：${skill.effect}满能量后输入角色专属长句；不是点牌直接造成伤害。`,
  }
  const common = { onInspect: setInspected, onLeave: () => setInspected(null) }
  return <aside className="battle-hand" aria-label="战斗技能牌">
    <div className="battle-hand__caption"><span>咒卡手札</span><small>选牌 · 拼写 · 出击</small></div>
    <div className="battle-hand__fan">
      {(Object.keys(SPELL_CARDS) as PreparedSpell[]).map((id, index) => {
        const card = SPELL_CARDS[id], selected = state.preparedSpell === id, ready = canPrepareSpell(state, id)
        return <HandCard key={id} {...common} id={id} index={index} type={card.type} icon={card.icon} name={card.name} counter={`${card.cost}能量`}
          rule={card.rule} status={selected ? '已准备 · 再点取消' : id === 'ward' && state.shield >= 40 ? '护盾已满' : ready ? '点击准备 · 拼对生效' : `还需 ${Math.max(0, card.cost - state.energy)} 能量`}
          art={<img src={card.art} alt=""/>} disabled={locked || chanting || !onPrepare || (!ready && !selected)} selected={selected} ready={ready}
          played={state.last?.spell === id} onClick={() => onPrepare?.(id)}/>
      })}
      <HandCard {...common} id="tactic" index={2} type="角色战技" icon="✧" name={tactic.name} counter={`${Math.min(3,state.normalHits)}/3`}
        rule={tacticRule} status={tacticStatus} label={tacticLabel} art={<SkillCardArt avatar={state.avatar}/>}
        disabled={locked || chanting || !onTactic || state.tacticUsed || state.normalHits < 3 || (state.avatar === 'mage' && state.energy >= MAX_ENERGY)}
        ready={state.normalHits >= 3 && !state.tacticUsed} played={!!state.last?.tactic} onClick={onTactic}/>
      <HandCard {...common} id="spirit" index={3} type="精灵支援" icon="❧" name={SPIRIT_SKILLS[state.companion].name} counter={`${progress}/${every}`}
        rule={spiritEffect(state.companion, state.spiritRank)} status={`再命中 ${every - progress} 次触发`} label={`${spirit.name} · 自动支援`}
        art={<img src={`/art/growth-v1/${state.companion}/evolution-${state.spiritRank >= 3 ? 3 : 1}.webp`} alt=""/>} automatic played={!!state.last?.spirit}/>
      <HandCard {...common} id="ultimate" index={4} type="长句大招" icon="✵" name={skill.ultimate} counter={`${state.energy}/100`}
        rule={skill.effect} status={chanting ? '咏唱中 · 点击返回' : state.energy >= MAX_ENERGY ? '点击咏唱完整长句' : '准确拼写，积攒能量'} label={chantLabel}
        art={<SkillCardArt avatar={state.avatar}/>} disabled={locked || state.energy < MAX_ENERGY} ready={state.energy >= MAX_ENERGY} selected={chanting} played={!!state.last?.ultimate} onClick={onChant}/>
    </div>
    <div className="battle-hand__detail" aria-live="polite"><strong>{inspected ? '牌面说明' : chanting ? '长句咏唱' : prepared ? `已准备 · ${prepared.name}` : '基础咒卡 · 无额外消耗'}</strong>
      <span>{inspected ? details[inspected] : chanting ? '拼对专属长句，释放大招；点击大招牌可返回。' : prepared ? '下一次拼写命中生效。错拼不扣能量，再点同一张牌可取消。' : '直接输入英文即可攻击。悬停或聚焦牌面查看规则。'}</span>
      {prepared && !inspected && <button type="button" disabled={locked || chanting} onClick={() => onPrepare?.(null)}>取消准备</button>}
    </div>
  </aside>
}
