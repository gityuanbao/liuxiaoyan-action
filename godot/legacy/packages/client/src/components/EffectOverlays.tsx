import { AbilityId, type ActiveEffect } from '@typeduel/shared'

interface EffectOverlaysProps {
  effects: ActiveEffect[]
}

export function EffectOverlays({ effects }: EffectOverlaysProps) {
  const hasEffect = (id: AbilityId) => effects.some(e => e.abilityId === id)

  return (
    <>
      {/* BLACKOUT: near-black overlay */}
      {hasEffect(AbilityId.BLACKOUT) && (
        <div
          className="absolute inset-0 bg-black/90 z-30 pointer-events-none rounded animate-pulse"
          data-effect="blackout"
        />
      )}

      {/* FREEZE: blue frost overlay */}
      {hasEffect(AbilityId.FREEZE) && (
        <div
          className="absolute inset-0 z-30 pointer-events-none rounded border-2 border-blue-400/60"
          data-effect="freeze"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 30%, rgba(59, 130, 246, 0.15) 100%)',
            boxShadow: 'inset 0 0 30px rgba(59, 130, 246, 0.2)',
          }}
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-blue-300 text-xs font-bold animate-pulse uppercase tracking-widest">
            冰霜封印
          </div>
        </div>
      )}

      {/* MIRROR: shield overlay (on the caster, so shown on self) */}
      {hasEffect(AbilityId.MIRROR) && (
        <div
          className="absolute inset-0 z-20 pointer-events-none rounded"
          data-effect="mirror"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(168, 85, 247, 0.08) 0%, transparent 70%)',
            boxShadow: 'inset 0 0 20px rgba(168, 85, 247, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-purple-300 text-xs font-bold animate-pulse uppercase tracking-widest">
            镜面护盾
          </div>
        </div>
      )}

      {/* SURGE: green glow (on the caster) */}
      {hasEffect(AbilityId.SURGE) && (
        <div
          className="absolute inset-0 z-20 pointer-events-none rounded"
          data-effect="surge"
          style={{
            boxShadow: 'inset 0 0 25px rgba(34, 197, 94, 0.2), 0 0 15px rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-green-300 text-xs font-bold animate-pulse uppercase tracking-widest">
            雷霆增幅
          </div>
        </div>
      )}

      {/* SCRAMBLE indicator */}
      {hasEffect(AbilityId.SCRAMBLE) && (
        <div
          className="absolute top-2 right-2 z-30 text-yellow-400 text-xs font-bold animate-pulse"
          data-effect="scramble"
        >
          文字扰乱
        </div>
      )}

      {/* PHANTOM KEYS indicator */}
      {hasEffect(AbilityId.PHANTOM_KEYS) && (
        <div
          className="absolute top-2 right-2 z-30 text-gray-400 text-xs font-bold animate-pulse"
          data-effect="phantom"
        >
          幻影字符
        </div>
      )}
    </>
  )
}
