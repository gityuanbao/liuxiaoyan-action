

import { Suspense, lazy, useEffect, useState } from 'react'
import { useGameStore } from './store'












import { loadStoredResumeSession, useWebSocket } from './hooks/useWebSocket'







import { TitleScreen } from './academy/TitleScreen'
import { JourneyLoadBoundary } from './academy/JourneyLoadBoundary'

import './academy/galgame.css'
import './academy/adventure.css'
import './academy/theatre.css'
import './academy/dialogue.css'
import './academy/sanctum.css'
import './academy/battle-theatre.css'
import './academy/lettercraft.css'
import './academy/journey-design.css'
import './academy/growth.css'
import './academy/title.css'
import './academy/audio-library.css'
import './academy/reference-ui.css'
import './academy/monster-battle.css'
import './academy/expedition.css'
import './academy/arcane-effects.css'
import './academy/character-feedback.css'
import './academy/folio.css'
import './academy/moonlit-theme.css'
import './academy/typing-hall.css'
import './academy/page-icons.css'
import './academy/battle-hand.css'

const ExpeditionPage = lazy(() => import('./academy/ExpeditionPage').then(m => ({ default: m.ExpeditionPage })))
const JourneyCamp = lazy(() => import('./academy/JourneyCamp').then(m => ({ default: m.JourneyCamp })))
const Lobby = lazy(() => import('./components/Lobby').then(m => ({ default: m.Lobby })))
const Matchmaking = lazy(() => import('./components/Matchmaking').then(m => ({ default: m.Matchmaking })))
const WaitingRoom = lazy(() => import('./components/WaitingRoom').then(m => ({ default: m.WaitingRoom })))
const Countdown = lazy(() => import('./components/Countdown').then(m => ({ default: m.Countdown })))
const GameScreen = lazy(() => import('./components/GameScreen').then(m => ({ default: m.GameScreen })))
const Results = lazy(() => import('./components/Results').then(m => ({ default: m.Results })))
const RoundEnd = lazy(() => import('./components/RoundEnd').then(m => ({ default: m.RoundEnd })))
const SpectateScreen = lazy(() => import('./components/SpectateScreen').then(m => ({ default: m.SpectateScreen })))
const PracticeSetup = lazy(() => import('./components/PracticeSetup').then(m => ({ default: m.PracticeSetup })))
const PracticeGame = lazy(() => import('./components/PracticeGame').then(m => ({ default: m.PracticeGame })))
const PracticeResults = lazy(() => import('./components/PracticeResults').then(m => ({ default: m.PracticeResults })))
const SettingsPanel = lazy(() => import('./components/SettingsPanel').then(m => ({ default: m.SettingsPanel })))
const VocabularyBattle = lazy(() => import('./academy/VocabularyBattle').then(m => ({ default: m.VocabularyBattle })))
const AppearancePage = lazy(() => import('./academy/Appearance').then(m => ({ default: m.AppearancePage })))
const StoryPage = lazy(() => import('./academy/StoryPage').then(m => ({ default: m.StoryPage })))
const NotebookPage = lazy(() => import('./academy/NotebookPage').then(m => ({ default: m.NotebookPage })))
const TrialPage = lazy(() => import('./academy/TrialPage').then(m => ({ default: m.TrialPage })))
const WorldLorePage = lazy(() => import('./academy/WorldLorePage').then(m => ({ default: m.WorldLorePage })))
const AudioLibrary = lazy(() => import('./academy/AudioLibrary').then(m => ({ default: m.AudioLibrary })))
const AcademyLayout = lazy(() => import('./academy/Academy').then(m => ({ default: m.AcademyLayout })))
const AcademyHome = lazy(() => import('./academy/Academy').then(m => ({ default: m.AcademyHome })))
const AtlasPage = lazy(() => import('./academy/Academy').then(m => ({ default: m.AtlasPage })))
const StudyPage = lazy(() => import('./academy/Academy').then(m => ({ default: m.StudyPage })))
const SpiritsPage = lazy(() => import('./academy/Academy').then(m => ({ default: m.SpiritsPage })))

export function App() {
  const [selectedPack, setSelectedPack] = useState('environment')
  const screen = useGameStore((s) => s.screen)
  const setScreen = useGameStore((s) => s.setScreen)
  const setIsSpectating = useGameStore((s) => s.setIsSpectating)
  const crtEnabled = useGameStore((s) => s.crtEnabled)
  const uiScale = useGameStore((s) => s.uiScale)
  const highContrast = useGameStore((s) => s.highContrast)
  const reducedMotion = useGameStore((s) => s.reducedMotion)
  const settingsOpen = useGameStore((s) => s.settingsOpen)
  const { connect } = useWebSocket()

  useEffect(() => {
    const sizes = { small: '14px', medium: '16px', large: '20px' }
    document.documentElement.style.fontSize = sizes[uiScale]
  }, [uiScale])

  useEffect(() => {
    const resumeSession = loadStoredResumeSession()
    if (!resumeSession) return

    setIsSpectating(resumeSession.isSpectating)
    setScreen(resumeSession.isSpectating ? 'spectating' : 'waiting-room')
    connect(resumeSession)
  }, [connect, setIsSpectating, setScreen])

  useEffect(() => {
    if (!import.meta.env.DEV) return

    ;(window as Window & { __typeduelStore?: typeof useGameStore }).__typeduelStore = useGameStore
    return () => {
      delete (window as Window & { __typeduelStore?: typeof useGameStore }).__typeduelStore
    }
  }, [])

  const rootClasses = [
    'game-polish',
    crtEnabled ? 'crt-scanlines' : '',
    highContrast ? 'high-contrast' : '',
    reducedMotion ? 'reduced-motion' : '',
  ].filter(Boolean).join(' ')
  const explore = (pack: string) => { setSelectedPack(pack); setScreen('vocabulary') }

  return (
    <div className={rootClasses}><JourneyLoadBoundary><Suspense fallback={<div className="journey-loading" role="status"><span aria-hidden="true">✧</span><h2>正在展开旅途</h2><p>星灯即将照亮下一段航路…</p></div>}>
      {screen === 'title' ? <TitleScreen/> : <AcademyLayout>
      {screen === 'audio-library' && <AudioLibrary onBattle={() => { setSelectedPack('human'); setScreen('listening') }}/>}
      {screen === 'expedition' && <ExpeditionPage/>}
      {screen === 'camp' && <JourneyCamp/>}
      {screen === 'academy' && <AcademyHome onExplore={explore}/>}
      {screen === 'vocabulary' && <VocabularyBattle key={selectedPack} initialPack={selectedPack}/>}
      {screen === 'sentence' && <VocabularyBattle key="sentence" initialPack={selectedPack} lesson="sentence"/>}
      {screen === 'listening' && <VocabularyBattle key={`listening-${selectedPack}`} initialPack={selectedPack} lesson="listening"/>}
      {screen === 'story' && <StoryPage/>}
      {screen === 'exam' && <TrialPage/>}
      {screen === 'notebook' && <NotebookPage onPractice={() => explore('notebook')}/>}
      {screen === 'world' && <WorldLorePage/>}
      {screen === 'atlas' && <AtlasPage/>}
      {screen === 'study' && <StudyPage onReview={() => explore('review')}/>}
      {screen === 'spirits' && <SpiritsPage/>}
      {screen === 'appearance' && <AppearancePage/>}
      <div className="legacy-surface">
      {screen === 'lobby' && <Lobby />}
      {screen === 'matchmaking' && <Matchmaking />}
      {screen === 'waiting-room' && <WaitingRoom />}
      {screen === 'countdown' && <Countdown />}
      {screen === 'game' && <GameScreen />}
      {screen === 'spectating' && <SpectateScreen />}
      {screen === 'round-end' && <RoundEnd />}
      {screen === 'results' && <Results />}
      {screen === 'practice-setup' && <PracticeSetup />}
      {screen === 'practice' && <PracticeGame />}
      {screen === 'practice-results' && <PracticeResults />}
      </div>
      </AcademyLayout>}
      {settingsOpen && <Suspense fallback={<div className="journey-veil" role="status"><div className="journey-dialog">正在打开系统设置…</div></div>}><SettingsPanel /></Suspense>}
      </Suspense></JourneyLoadBoundary>
    </div>
  )
}
