import { optimizedArt } from './optimized-art'
import { ArcaneEffects } from './ArcaneEffects'
import { BattleArt, SpiritArt } from './BattleArt'
import { HERO_GROWTH } from './battle-identity'
import { useEffect, useRef, useState } from 'react'
import { animate } from 'animejs'
import { useReducedMotion } from './useReducedMotion'
import { CHARACTERS, type AvatarId } from './Appearance'
import { CHARACTER_SKILLS, type SpiritId } from './combat-skills'
import { SPIRITS } from './words'
import { MAX_HP, type DuelState } from './duel-engine'
import { sfx } from '../audio'
import { ArcaneSigil } from './ArcaneArt'
import { CombatReadout } from './CombatReadout'
import { MONSTERS, type MonsterId } from './monster-data'
import { SkillCardArt } from './SkillCardArt'
import { SPELL_CARDS } from './spell-cards'

export function DuelArena({ state, avatar, active, paused, playerName, companion = 'moon', monster = 'crystal', enemy }: { companion?: SpiritId; state: DuelState; avatar: AvatarId; active: boolean; paused: boolean; playerName: string; monster?: MonsterId; enemy?: string }) {
  const arena = useRef<HTMLDivElement>(null)
  const motions = useRef<ReturnType<typeof animate>[]>([])
  const reducedMotion = useReducedMotion()
  const creature = MONSTERS[monster]
  const enemyMaxHp = state.enemyMaxHp ?? MAX_HP
  const spirit = SPIRITS.find(s => s.id === companion)!
  const last = state.last
  const [cue, setCue] = useState<DuelState['last']>(null)
  useEffect(() => {
    if (!last) { setCue(null); return }
    setCue(last)
    const timer = setTimeout(() => setCue(null), last.ultimate ? 1250 : 950)
    return () => clearTimeout(timer)
  }, [last?.id])
  useEffect(() => {
    if (!arena.current || reducedMotion || paused) return
    const animations = [...arena.current.querySelectorAll('.portrait-idle')].map((el, i) => animate(el, { y: [-3, 3], duration: 2800 + i * 400, alternate: true, loop: true, ease: 'inOutSine' }))
    return () => animations.forEach(a => a.revert())
  }, [reducedMotion, paused])
  useEffect(() => {
    const root = arena.current
    const hit = state.last
    if (!root || !hit || paused) return
    if (typeof AudioContext !== 'undefined') { if (hit.actor === 'bot') sfx.damage(); else sfx.arcaneCast(avatar, hit.ultimate ? 3 : hit.burst ? 2 : 1) }
    if (reducedMotion) return
    const playerAttack = hit.actor === 'player'
    const from = root.querySelector(playerAttack ? '.duelist-left .portrait-motion' : '.duelist-right .portrait-motion')!
    const target = root.querySelector(playerAttack ? '.duelist-right .portrait-motion' : '.duelist-left .portrait-motion')!
    const card = root.querySelector<HTMLElement>('.card-projectile')!
    if (hit.tactic) {
      const support = [animate(from, { scale: [1, 1.06, 1], duration: 550 }), animate(card, { x: [0, -30], y: [35, -85], opacity: [1, 1, 0], scale: [.65, 1.05, .8], rotate: [-15, 0], duration: 650 })]
      motions.current = support
      return () => support.forEach(a => a.revert())
    }
    const projectile = playerAttack ? card : root.querySelector<HTMLImageElement>('.spell-projectile')!
    const impact = root.querySelector<HTMLImageElement>('.spell-impact')!
    const sign = playerAttack ? 1 : -1
    projectile.style.left = playerAttack ? '27%' : '72%'
    impact.style.left = playerAttack ? '73%' : '24%'
    const animations = [
      animate(from, { x: [0, sign * 36, 0], duration: 440, ease: 'outQuad' }),
      animate(projectile, { x: [0, sign * root.clientWidth * .46], y: playerAttack ? [50, -75, -65] : [0, 0], opacity: [1, 1, 0], scale: playerAttack ? hit.ultimate ? [.75, 1.5, .7] : [.65, 1.1, .45] : [.8, 1.4], rotate: playerAttack ? [-20, 4, 34] : [0, -120], duration: playerAttack ? 420 : 300, ease: 'inQuad' }),
      animate(target, { x: [0, sign * (hit.ultimate ? 48 : 24), -sign * 8, 0], filter: ['brightness(1)', 'brightness(2.3)', 'brightness(1)'], delay: playerAttack ? 280 : 190, duration: 420 }),
      animate(impact, { opacity: [0, 1, 0], scale: [0.4, hit.ultimate ? 3.5 : hit.burst ? 2.6 : 1.9], delay: playerAttack ? 275 : 180, duration: 430 }),
    ]
    motions.current = animations
    let frame = 0
    const frames = window.setInterval(() => { frame++; impact.src = `/art/galgame/impact-${frame % 4}.png` }, 95)
    const stop = window.setTimeout(() => window.clearInterval(frames), 800)
    return () => { animations.forEach(a => a.revert()); clearInterval(frames); clearTimeout(stop) }
  }, [state.last?.id, reducedMotion])
  useEffect(() => { if (paused) motions.current.forEach(a => a.revert()) }, [paused])
  return <section className="encounter-arena" aria-label="小怪战场">
    <div className={`encounter-hud ${active ? 'is-fighting' : 'is-preview'}`}>
      <div className="duel-health left" title={HERO_GROWTH[avatar][state.heroRank - 1]}><img className="duel-hud-avatar" src={optimizedArt(`/art/galgame/${avatar}-avatar.png`)} alt=""/><div><span>{CHARACTERS[avatar].title}</span><b>{playerName || CHARACTERS[avatar].name}</b></div><strong><span className="hud-heart" aria-hidden="true">♥</span>{state.playerHp}<small> / {MAX_HP}</small></strong><div className="hp-track" role="meter" aria-label="你的生命" aria-valuemin={0} aria-valuemax={MAX_HP} aria-valuenow={state.playerHp}><i style={{ width: `${state.playerHp / MAX_HP * 100}%` }}/></div><div className="hud-energy"><span>✦ 能量 {state.energy}/100 · 护盾 {state.shield}</span><div className="energy-track"><i style={{ width: `${state.energy}%` }}/></div></div></div>
      <div className="duel-health right" title={enemy ?? creature.habitat}><div><span>{enemy ? '剧情遭遇' : creature.habitat}</span><b>{creature.name}</b></div><strong>{state.botHp}<small> / {enemyMaxHp}</small></strong><div className="hp-track" role="meter" aria-label="小怪生命" aria-valuemin={0} aria-valuemax={enemyMaxHp} aria-valuenow={state.botHp}><i style={{ width: `${state.botHp / enemyMaxHp * 100}%` }}/></div><small className="monster-status">{state.outcome === 'victory' ? '雾蚀已驱散' : active ? '准确拼写，逐次削弱' : '以拼写打出你的第一张咒卡'}</small></div>
      {active ? <CombatReadout state={state} paused={paused} celebration={!paused && cue?.actor === 'player' ? cue.ultimate ? '咏唱完成！' : cue.burst ? '四连击！' : undefined : undefined}/> : <div className="encounter-intro">拼写 · 出牌 · 命中<small>正确输入才会造成伤害</small></div>}
    </div>
    <div ref={arena} data-outcome={state.outcome ?? undefined} className={`duel-stage skill-stage monster-stage ${enemy ? 'story-enemy-stage' : ''} ${paused ? 'duel-paused' : ''} ${reducedMotion ? 'motion-reduced' : ''} role-${avatar} monster-${monster}`} style={{ '--skill-color': CHARACTERS[avatar].color, '--monster-color': creature.color } as React.CSSProperties}>
      <ArcaneEffects cue={cue} avatar={avatar} monster={monster} paused={paused}/><ArcaneSigil className="duel-sigil sigil-player"/><ArcaneSigil className="duel-sigil sigil-opponent"/>{cue && <ArcaneSigil key={`sigil-${cue.id}`} className={`hit-sigil ${cue.actor === 'player' && !cue.tactic ? 'on-bot' : 'on-player'} ${cue.ultimate ? 'ultimate-sigil' : ''}`}/>}
    <div className="duelist duelist-left"><div className="portrait-idle"><div className="portrait-motion"><BattleArt avatar={avatar} side="left" event={cue?.id} casting={cue?.actor === 'player'} hurt={cue?.actor === 'bot'} victory={state.outcome === 'victory'} paused={paused}/></div></div><span className="duelist-platform"/><div className={`battle-companion spirit-${companion} ${cue?.spirit ? 'spirit-proc' : ''}`}><SpiritArt id={companion} rank={state.spiritRank} name={`战斗伙伴 ${spirit.name}`} paused={paused}/></div></div>
    <div className="duelist duelist-right"><div className="portrait-idle"><div className="portrait-motion"><img className="monster-body-art" src={creature.image} alt={creature.name}/></div></div><span className="duelist-platform"/></div>
    <div className={`card-projectile ${cue?.actor === 'player' ? 'has-fired' : ''} ${last?.tactic ? 'support-card-flight' : ''}`} data-flight-event={cue?.actor === 'player' ? cue.id : undefined} aria-hidden="true">{last?.spell ? <img className="skill-illustration" src={SPELL_CARDS[last.spell].art} alt=""/> : <SkillCardArt avatar={avatar}/>}<i>{last?.spell ? SPELL_CARDS[last.spell].icon : '✦'}</i><b>{last?.tactic ? last.skill : last?.ultimate || last?.spell ? last.skill : '拼写咒卡'}</b></div>
    <img className="spell-projectile" src="/art/galgame/impact-1.png" alt=""/><img className="spell-impact" src="/art/galgame/impact-0.png" alt=""/>
    {cue && <div key={`cue-${cue.id}`} className={`combat-hit-layer hit-${cue.actor} ${cue.tactic ? 'hit-tactic' : cue.ultimate ? 'hit-ultimate' : cue.burst ? 'hit-burst' : ''}`} aria-hidden="true"><div className="combat-ray"/><div className="combat-impact"><i className="combat-ring"/><i className="combat-slash"/>{Array.from({ length: 8 }, (_, i) => <i key={i} className="combat-shard" style={{ '--shard-angle': `${i * 45}deg` } as React.CSSProperties}/>)}</div><div className="combat-callout"><small>{cue.actor === 'bot' ? '敌方反击' : cue.spell ? `${SPELL_CARDS[cue.spell].type}咒卡 · 拼写命中` : cue.tactic ? '角色战技' : cue.ultimate ? '长句大招' : cue.burst ? '四连击 · 星耀爆发' : '拼写命中'}</small><b>{cue.actor === 'bot' && !cue.damage ? '护盾抵挡' : cue.skill ?? cue.passive ?? (cue.actor === 'player' ? '咒语冲击' : '雾蚀冲击')}</b></div></div>}
    {cue && <div key={`damage-${cue.id}`} className={`damage-number ${cue.actor === 'player' ? 'on-bot' : 'on-player'}`}>{cue.skill ? <small>{cue.skill}</small> : cue.burst && <small>星耀连击</small>}{cue.tactic ? '' : cue.damage ? `−${cue.damage}` : cue.warded ? '长句封印' : '护盾'}{cue.absorbed ? <small>吸收 {cue.absorbed}</small> : null}</div>}
    {!!cue?.burn && <div key={`burn-${cue.id}`} className="damage-number on-bot"><small>炎星灼烧</small>−{cue.burn}</div>}
    {cue?.actor === 'player' && (cue.heal || cue.shield || cue.spirit || cue.passive || cue.energyGain) ? <div key={`support-${cue.id}`} className="support-flash">{cue.spirit && <b>{cue.spirit}</b>}{cue.passive && <b>{cue.passive}</b>}{!!cue.energySpent && <span>咒卡消耗 {cue.energySpent}</span>}{!!cue.energyGain && <span>能量 +{cue.energyGain}</span>}{!!cue.heal && <span>生命 +{cue.heal}</span>}{!!cue.shield && <span>护盾 +{cue.shield}</span>}</div> : null}
    {cue?.ultimate && <div key={`ultimate-${cue.id}`} className="ultimate-cut-in"><div><small>长句咏唱完成</small><h2>{cue.skill}</h2><p>{CHARACTERS[avatar].name} · {CHARACTER_SKILLS[avatar].effect}</p></div></div>}
    {!active && <div className="duel-scene-caption">将单词化为法术，在星光下与你交锋。</div>}
  </div></section>
}
