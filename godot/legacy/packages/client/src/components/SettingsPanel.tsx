import { useEffect } from 'react'
import type { Difficulty } from '@typeduel/shared'
import { useGameStore } from '../store'
import { sfx, type SoundPreset } from '../audio'

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-text/60">{label}</span>
      <button onClick={onChange} aria-label={label} aria-pressed={value} className={`w-10 h-5 rounded-full transition-colors ${value ? 'bg-accent' : 'bg-border'}`}>
        <div className={`w-4 h-4 rounded-full bg-text transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: '初阶' },
  { value: 'medium', label: '中阶' },
  { value: 'hard', label: '高阶' },
]

const SOUND_PRESETS: { value: SoundPreset; label: string }[] = [
  { value: 'thock', label: '低沉' },
  { value: 'clack', label: '清脆' },
  { value: 'click', label: '轻响' },
  { value: 'typewriter', label: '打字机' },
  { value: 'silent', label: '静音' },
]

const UI_SCALES: { value: 'small' | 'medium' | 'large'; label: string }[] = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
]

export function SettingsPanel() {
  const {
    uiScale, setUiScale,
    crtEnabled, toggleCrt,
    reducedMotion, toggleReducedMotion,
    highContrast, toggleHighContrast,
    soundEnabled, toggleSound,
    pronunciationEnabled, togglePronunciation,
    soundVolume, setSoundVolume,
    soundPreset, setSoundPreset,
    defaultDifficulty, setDefaultDifficulty,
    showCombatLog, toggleCombatLog,
    setSettingsOpen,
  } = useGameStore()

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [setSettingsOpen])

  return (
    <div className="settings-veil fixed inset-0 z-[9998] flex items-center justify-center bg-bg/80" onClick={() => setSettingsOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="系统设置"
        className="system-settings bg-surface border border-border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => setSettingsOpen(false)}
          aria-label="关闭设置"
          className="absolute top-4 right-4 text-text/40 hover:text-text/80 transition-colors"
          data-testid="settings-close"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l12 12M16 4L4 16" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-accent mb-6">旅人设置</h2>

        {/* Visual Section */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-text/40 uppercase tracking-wider mb-3">显示</h3>

          {/* UI Scale */}
          <div className="py-2">
            <span className="text-text/60 text-sm block mb-2">界面大小</span>
            <div className="flex gap-2">
              {UI_SCALES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setUiScale(s.value)}
                  className={`flex-1 py-1.5 rounded border text-sm font-bold transition-colors ${
                    uiScale === s.value
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text/40 hover:border-text/30'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <Toggle label="复古扫描线" value={crtEnabled} onChange={toggleCrt} />
          <Toggle label="减少动态效果" value={reducedMotion} onChange={toggleReducedMotion} />
          <Toggle label="高对比度" value={highContrast} onChange={toggleHighContrast} />
        </div>

        {/* Audio Section */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-text/40 uppercase tracking-wider mb-3">声音</h3>

          <Toggle label="音效与朗读" value={soundEnabled} onChange={toggleSound} />
          <p className="settings-help">控制打击音效与答后朗读；听力题使用各自的播放按钮。</p>
          <Toggle label="答对后自动朗读" value={pronunciationEnabled} onChange={togglePronunciation} />

          {soundEnabled && (
            <>
              <div className="py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-text/60 text-sm">音量</span>
                  <span className="text-text/40 text-xs tabular-nums">{soundVolume}%</span>
                </div>
                <input
                  type="range"
                  aria-label="音量"
                  min={0}
                  max={100}
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>

              <div className="py-2">
                <span className="text-text/60 text-sm block mb-2">按键音效</span>
                <div className="flex gap-1.5 flex-wrap">
                  {SOUND_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => {
                        setSoundPreset(p.value)
                        // Play a preview
                        sfx.keystroke()
                      }}
                      className={`px-3 py-1.5 rounded border text-xs font-bold transition-colors ${
                        soundPreset === p.value
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-text/40 hover:border-text/30'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Gameplay Section */}
        <div className="mb-2">
          <h3 className="text-sm font-bold text-text/40 uppercase tracking-wider mb-3">游戏</h3>

          {/* Default Difficulty */}
          <div className="py-2">
            <span className="text-text/60 text-sm block mb-2">默认难度</span>
            <div className="flex gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDefaultDifficulty(d.value)}
                  className={`flex-1 py-1.5 rounded border text-sm font-bold transition-colors ${
                    defaultDifficulty === d.value
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text/40 hover:border-text/30'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <Toggle label="战斗记录" value={showCombatLog} onChange={toggleCombatLog} />
        </div>
      </div>
    </div>
  )
}
