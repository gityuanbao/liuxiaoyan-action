import { useEffect, useRef, useCallback, useState } from 'react'
import { useGameStore } from '../store'
import { sfx } from '../audio'
import { MODE_LABELS, DIFFICULTY_LABELS } from '../labels'
import { addLearningRecord } from '../academy/learning-store'
import { PracticeEngine, type PracticeState, type PracticeConfig } from '../practice/engine'
import { TypingArea } from './TypingArea'
import { EffectOverlays } from './EffectOverlays'
import { AbilityBar } from './AbilityBar'
import { Icon } from '../academy/Icon'

export function PracticeGame() {
  const config = useGameStore(s => s.practiceConfig)
  const setScreen = useGameStore(s => s.setScreen)
  const setPracticeState = useGameStore(s => s.setPracticeState)
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const engineRef = useRef<PracticeEngine | null>(null)
  const [state, setState] = useState<PracticeState | null>(null)

  useEffect(() => {
    if (!config) return
    const engine = new PracticeEngine(config, (newState) => {
      setState(newState)
      if (newState.status === 'finished') {
        setPracticeState(newState)
        if (newState.totalKeystrokes > 0) {
          try { addLearningRecord({ id: 'typing:' + newState.startTime, kind: 'typing', title: MODE_LABELS[config.mode] + ' · ' + DIFFICULTY_LABELS[config.difficulty], date: new Date().toISOString(), correct: newState.totalCorrect, total: newState.totalKeystrokes, duration: Math.max(1, Math.round(newState.timeElapsed)), xp: Math.min(30, 5 + Math.floor(newState.totalCorrect / 30)) }) } catch { /* Native practice results remain available if academy storage is full. */ }
        }
        setTimeout(() => setScreen('practice-results'), 500)
      }
    })
    engineRef.current = engine
    engine.start()
    return () => engine.cleanup()
  }, [config, setScreen, setPracticeState])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const engine = engineRef.current
    if (!engine || !state || state.status !== 'active' || useGameStore.getState().settingsOpen) return

    if (e.key === 'Backspace' || (e.key.length === 1 && !e.ctrlKey && !e.metaKey)) {
      e.preventDefault()
    }

    if (e.key === 'Backspace') {
      engine.handleKeystroke('BACKSPACE')
      return
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      engine.handleKeystroke(e.key)
    }
  }, [state, config])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    hiddenInputRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    const refocus = () => { if (!useGameStore.getState().settingsOpen) hiddenInputRef.current?.focus() }
    window.addEventListener('click', refocus)
    return () => window.removeEventListener('click', refocus)
  }, [])

  if (!config || !state) return null

  // Countdown screen
  if (state.status === 'countdown') {
    return (
      <div className="practice-arrival">
        <div className="practice-arrival-seal" aria-hidden="true"><Icon name="book" size={42}/></div>
        <div className="practice-arrival-copy">
          <div className="text-text/40 text-sm mb-4 uppercase tracking-wider">
            {config.mode === 'bot' ? `精灵对战（${DIFFICULTY_LABELS[config.botDifficulty]}）` :
             config.mode === 'timed' ? `限时挑战（${config.duration} 秒）` :
             config.mode === 'accuracy' ? '精准挑战' :
             config.mode === 'sudden-death' ? '极限挑战' :
             config.mode === 'marathon' ? '耐力挑战（五分钟）' : '自由练习'}
          </div>
          <div className="practice-countdown-number" aria-live="polite">
            {state.countdownSeconds || '...'}
          </div>
          <p className="text-text/40 text-sm mt-4">双手就位，让英文成为你的咒语。</p>
        </div>
      </div>
    )
  }

  const isBot = config.mode === 'bot'
  const isTimed = config.mode === 'timed' || isBot || config.mode === 'marathon' || config.mode === 'sudden-death'
  const isLowHp = isBot && state.playerHp > 0 && state.playerHp < 20

  // Build a fake PlayerState for TypingArea compatibility
  const localPlayer = {
    id: 'player',
    displayName: '你',
    hp: state.playerHp,
    cursor: state.cursor,
    wpm: state.wpm,
    accuracy: Math.round(state.accuracy * 10) / 10,
    energy: state.playerEnergy,
    activeEffects: state.playerActiveEffects,
    streak: state.streak,
  }

  const minutes = isTimed ? Math.floor(state.timeLeft / 60) : Math.floor(state.timeElapsed / 60)
  const seconds = isTimed ? state.timeLeft % 60 : state.timeElapsed % 60

  return (
    <div className="min-h-screen flex flex-col p-4 practice-battle">
      {/* Low HP vignette */}
      {isLowHp && (
        <div className="fixed inset-0 z-40 pointer-events-none low-hp-vignette" />
      )}

      {/* Hidden input */}
      <input
        ref={hiddenInputRef}
        aria-label="试炼英文输入"
        className="opacity-0 absolute w-0 h-0"
        autoFocus
        onBlur={(e) => { if (!useGameStore.getState().settingsOpen) e.target.focus() }}
      />

      {/* Top Bar */}
      <div className="practice-live-heading flex items-center justify-between mb-4">
        <div className="text-text/40 text-sm uppercase tracking-wider" data-testid="practice-mode-label">
          {config.mode === 'bot' ? '精灵对战' :
           config.mode === 'timed' ? '限时挑战' :
           config.mode === 'accuracy' ? '精准挑战' :
           config.mode === 'sudden-death' ? '极限挑战' :
           config.mode === 'marathon' ? '耐力挑战' : '自由练习'}
        </div>
        <div className="text-4xl font-bold text-accent tabular-nums" data-testid="practice-timer">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
        <button
          onClick={() => {
            engineRef.current?.cleanup()
            setScreen('practice-setup')
          }}
          className="gal-button ghost"
        >
          退出试炼
        </button>
      </div>

      {/* Main Area */}
      <div className={`practice-live-body flex-1 flex ${isBot ? 'gap-6' : 'justify-center'}`}>
        {/* Player Panel */}
        <div className={`${isBot ? 'flex-1' : 'w-full max-w-3xl'} min-w-0 relative`}>
          {/* Effect overlays */}
          <EffectOverlays effects={state.playerActiveEffects} />

          {/* Streak combo */}
          {state.streak >= 10 && (
            <div
              className={`absolute top-0 right-0 font-bold z-10 ${
                state.streak >= 50
                  ? 'text-lg combo-fire text-accent'
                  : state.streak >= 20
                  ? 'text-base combo-glow text-accent/80'
                  : 'text-sm combo-pulse text-accent/40'
              }`}
              data-testid="practice-combo"
            >
              {state.streak >= 50 ? '势不可挡' : state.streak >= 20 ? '火力全开' : '连续命中'} x{state.streak}
            </div>
          )}

          {/* Stats Row */}
          <div className="flex gap-6 mb-3">
            <div>
              <span className="text-3xl font-bold text-accent" data-testid="practice-wpm">{state.wpm}</span>
              <span className="text-xs text-text/40 ml-1">词/分</span>
            </div>
            <div>
              <span className="text-xl font-bold text-text/80">{state.accuracy.toFixed(1)}%</span>
              <span className="text-xs text-text/40 ml-1">正确率</span>
            </div>
            {(config.mode === 'accuracy' || config.mode === 'marathon') && (
              <div>
                <span className="text-xl font-bold text-accent">{state.totalCorrect}</span>
                <span className="text-xs text-text/40 ml-1">字符</span>
              </div>
            )}
            {config.mode === 'sudden-death' && (() => {
              const threshold = config.difficulty === 'easy' ? 20 : config.difficulty === 'medium' ? 35 : 50
              const danger = state.timeElapsed > 10 && state.wpm > 0 && state.wpm < threshold + 10
              return (
                <div>
                  <span className={`text-xl font-bold ${danger ? 'text-damage animate-pulse' : 'text-text/40'}`}>
                    {threshold}
                  </span>
                  <span className="text-xs text-text/40 ml-1">最低词速</span>
                </div>
              )
            })()}
          </div>

          {/* HP Bar (bot mode) */}
          {isBot && (
            <div className="mb-2">
              <div className="flex justify-between text-xs text-text/40 mb-1">
                <span>你的生命值</span>
                <span>{Math.round(state.playerHp)}/100</span>
              </div>
              <div className="w-full h-3 bg-bg border border-border rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    state.playerHp > 60 ? 'bg-accent' : state.playerHp > 30 ? 'bg-warning' : 'bg-damage'
                  }`}
                  style={{ width: `${state.playerHp}%` }}
                />
              </div>
            </div>
          )}

          {/* Energy Bar (bot mode) */}
          {isBot && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-text/40 mb-1">
                <span>技能能量</span>
                <span>{Math.round(state.playerEnergy)}/100</span>
              </div>
              <div className="w-full h-2 bg-bg border border-border rounded-full overflow-hidden">
                <div className="h-full bg-energy transition-all duration-300" style={{ width: `${state.playerEnergy}%` }} />
              </div>
            </div>
          )}

          {/* Typing Area */}
          <TypingArea
            text={state.text}
            player={localPlayer}
            isLocal={true}
            cursorOverride={state.cursor}
            errorIndex={state.errorIndex}
          />
        </div>

        {/* Bot Panel (bot mode only) */}
        {isBot && (
          <>
            <div className="w-px bg-border" />
            <div className="flex-1 min-w-0 relative">
              {/* Bot effect overlays */}
              <EffectOverlays effects={state.botActiveEffects} />

              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text/60 uppercase tracking-wider">训练幻影</span>
                <span className="font-bold text-lg text-damage">{DIFFICULTY_LABELS[config.botDifficulty]}</span>
              </div>

              {/* Bot HP */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-text/40 mb-1">
                  <span>生命值</span>
                  <span>{Math.round(state.botHp)}/100</span>
                </div>
                <div className="w-full h-3 bg-bg border border-border rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${
                      state.botHp > 60 ? 'bg-accent' : state.botHp > 30 ? 'bg-warning' : 'bg-damage'
                    }`}
                    style={{ width: `${state.botHp}%` }}
                  />
                </div>
              </div>

              {/* Bot Stats */}
              <div className="flex gap-4 mb-3">
                <div>
                  <span className="text-3xl font-bold text-damage">{state.botWpm}</span>
                  <span className="text-xs text-text/40 ml-1">词/分</span>
                </div>
                <div>
                  <span className="text-xl font-bold text-text/80">{state.botAccuracy.toFixed(1)}%</span>
                  <span className="text-xs text-text/40 ml-1">正确率</span>
                </div>
              </div>

              {/* Bot Typing Area */}
              <TypingArea
                text={state.text}
                player={{
                  id: 'bot',
                  displayName: '训练幻影',
                  hp: state.botHp,
                  cursor: state.botCursor,
                  wpm: state.botWpm,
                  accuracy: state.botAccuracy,
                  energy: state.botEnergy,
                  activeEffects: state.botActiveEffects,
                  streak: 0,
                }}
                isLocal={false}
              />
            </div>
          </>
        )}
      </div>

      <p className="practice-input-hint">跟随光标逐字输入英文，包含空格与标点。<span>Backspace 退格修改</span></p>
      {/* Ability Bar (bot mode) */}
      {isBot && (
        <AbilityBar
          player={localPlayer}
        />
      )}
    </div>
  )
}
