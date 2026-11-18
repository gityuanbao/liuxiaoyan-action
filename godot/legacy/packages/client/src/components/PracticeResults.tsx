import { useEffect, useState } from 'react'
import { useGameStore } from '../store'
import { savePersonalBest, getPersonalBests, getPbKey, type PersonalBest } from '../practice/engine'
import { WpmChart } from './WpmChart'
import { MODE_LABELS, DIFFICULTY_LABELS } from '../labels'
import { Icon } from '../academy/Icon'

export function PracticeResults() {
  const practiceState = useGameStore(s => s.practiceState)
  const practiceConfig = useGameStore(s => s.practiceConfig)
  const setScreen = useGameStore(s => s.setScreen)
  const [isNewPb, setIsNewPb] = useState(false)

  useEffect(() => {
    if (!practiceState || !practiceConfig) return
    const key = getPbKey(practiceConfig)
    const existing = getPersonalBests()[key]
    const newPb: PersonalBest = {
      wpm: practiceState.wpm,
      accuracy: Math.round(practiceState.accuracy * 10) / 10,
      streak: practiceState.maxStreak,
      date: new Date().toISOString(),
    }
    if (!existing || newPb.wpm > existing.wpm) {
      setIsNewPb(true)
    }
    savePersonalBest(key, newPb)
  }, [practiceState, practiceConfig])

  if (!practiceState || !practiceConfig) return null

  const isBot = practiceConfig.mode === 'bot'
  const botWon = isBot && (practiceState.playerHp <= 0 || (practiceState.playerHp < practiceState.botHp && practiceState.timeLeft <= 0))
  const playerWon = isBot && !botWon

  const modeLabel = MODE_LABELS[practiceConfig.mode] + (practiceConfig.mode === 'timed' ? `（${practiceConfig.duration} 秒）` : '')

  return (
    <section className="practice-outcome">
      <div className="practice-outcome-frame">
        {/* Title */}
        <header className="practice-outcome-heading">
          <span className="practice-outcome-seal" aria-hidden="true"><Icon name={playerWon || !isBot ? 'trophy' : 'shield'} size={34}/></span>
          <div>
          {isBot ? (
            <h2 className={`text-4xl font-bold results-title ${playerWon ? 'text-accent' : 'text-damage'}`}>
              {playerWon ? '对战胜利' : '再接再厉'}
            </h2>
          ) : (
            <h2 className="text-3xl font-bold text-accent results-title">修炼完成</h2>
          )}
          <div className="text-text/40 text-sm mt-1">{modeLabel} - {DIFFICULTY_LABELS[practiceConfig.difficulty]}</div>
          </div><p>把这次练习的节奏，带回下一段旅途。</p>
        </header>

        {/* New PB badge */}
        {isNewPb && (
          <div className="text-center mb-4" data-testid="new-pb-badge">
            <span className="text-accent font-bold bg-accent/10 border border-accent/30 rounded-full px-4 py-1 text-sm new-pb-glow">
              突破个人最佳纪录！
            </span>
          </div>
        )}

        {/* Stats */}
        <div className={`practice-outcome-stats ${isBot ? 'grid grid-cols-2 gap-6' : ''} mb-6`}>
          <div className={`p-4 rounded border border-accent/30 results-card results-card-1 ${isBot ? '' : ''}`}>
            <div className="text-sm text-text/40 mb-3 uppercase tracking-wider">
              {isBot ? '你的战绩' : '修炼成果'}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-text/60">输入速度</span>
                <span className="font-bold text-accent text-lg" data-testid="practice-result-wpm">{practiceState.wpm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text/60">正确率</span>
                <span className="font-bold">{practiceState.accuracy.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text/60">最高连击</span>
                <span className="font-bold">{practiceState.maxStreak}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text/60">正确输入字符</span>
                <span className="font-bold">{practiceState.totalCorrect}</span>
              </div>
              {isBot && (
                <>
                  <div className="flex justify-between">
                    <span className="text-text/60">造成伤害</span>
                    <span className="font-bold text-damage">{Math.round(practiceState.playerDamageDealt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text/60">剩余生命</span>
                    <span className="font-bold">{Math.round(practiceState.playerHp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text/60">技能次数</span>
                    <span className="font-bold">{practiceState.playerAbilitiesUsed}</span>
                  </div>
                </>
              )}
            </div>
            {practiceState.wpmHistory.length >= 2 && (
              <div className="mt-3">
                <div className="text-[10px] text-text/30 uppercase">输入速度变化（词/分钟）</div>
                <WpmChart data={practiceState.wpmHistory} height={56} />
              </div>
            )}
          </div>

          {/* Bot stats */}
          {isBot && (
            <div className="p-4 rounded border border-border results-card results-card-2">
              <div className="text-sm text-text/40 mb-3 uppercase tracking-wider">对战精灵（{DIFFICULTY_LABELS[practiceConfig.botDifficulty]}）</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-text/60">输入速度</span>
                  <span className="font-bold text-damage">{practiceState.botWpm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text/60">正确率</span>
                  <span className="font-bold">{practiceState.botAccuracy.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text/60">造成伤害</span>
                  <span className="font-bold text-damage">{Math.round(practiceState.botDamageDealt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text/60">剩余生命</span>
                  <span className="font-bold">{Math.round(practiceState.botHp)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text/60">技能次数</span>
                  <span className="font-bold">{practiceState.botAbilitiesUsed}</span>
                </div>
              </div>
              {practiceState.botWpmHistory.length >= 2 && (
                <div className="mt-3">
                  <div className="text-[10px] text-text/30 uppercase">输入速度变化（词/分钟）</div>
                  <WpmChart data={practiceState.botWpmHistory} height={56} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 results-buttons">
          <button
            onClick={() => setScreen('practice')}
            className="gal-button"
            data-testid="practice-retry"
          >
            再战一次
          </button>
          <button
            onClick={() => setScreen('practice-setup')}
            className="gal-button ghost"
          >
            调整修炼
          </button>
          <button
            onClick={() => useGameStore.getState().reset()}
            className="gal-button ghost"
          >
            返回群岛
          </button>
        </div>
      </div>
    </section>
  )
}
