import { battleStoryLine } from './story-battle'
import type { DuelState } from './duel-engine'
import type { StoryEncounter } from './story-encounters'
export function StoryBattleVoice({ story, state }: { story: StoryEncounter & { chapter: string }; state: DuelState }) {
  const line = battleStoryLine(story, state)
  return <aside className={`story-combat-voice voice-${line.side}`} aria-label="战况对白"><div><small>{line.progress} · {line.memory}</small><b>{line.speaker}</b></div><p>{line.text}</p></aside>
}
