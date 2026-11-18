import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { ArcaneEffects } from './ArcaneEffects'
import { castWord, castTactic, createDuel } from './duel-engine'
import { AVATAR_IDS } from './character-data'
afterEach(cleanup)
it('distinguishes all six hero spell patterns, combo tiers and support from damage', () => {
  for (const avatar of AVATAR_IDS) {
    let d = createDuel('relaxed', avatar)
    for (let n = 0; n < 3; n++) d = castWord(d, 'sun', 'sun')
    const view = render(<ArcaneEffects avatar={avatar} cue={castWord(d, 'sun', 'sun').last} paused={false}/>)
    expect(view.container.querySelector(`.fx-${avatar}.fx-combo .fx-spell-stream`)).not.toBeNull()
    view.rerender(<ArcaneEffects avatar={avatar} cue={castTactic(d).last} paused={false}/>)
    expect(view.container.querySelector('.fx-support .fx-boon')).not.toBeNull()
    expect(view.container.querySelector('.fx-strike')).toBeNull()
    view.rerender(<ArcaneEffects avatar={avatar} cue={d.last} paused/>)
    expect(view.container.querySelector('.arcane-fx')).toBeNull()
    view.unmount()
  }
})
