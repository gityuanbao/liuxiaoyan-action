import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AtlasPage } from './Academy'
import { addLearningRecord } from './learning-store'

vi.mock('./learning-store', () => ({ addLearningRecord: vi.fn() }))
const receipt = { type: 'ielts-atlas-result', source: 'ielts-atlas', version: 1, committed: true, practiceType: 'reading', id: 'genuine-result', title: '阅读练习', score: 8, total: 13, duration: 120, completedAt: '2026-10-11T02:00:00Z' }
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ available: true, readingCount: 242 }) }))
  // The result-boundary test needs a real child Window, without loading the independent app.
  const original = HTMLIFrameElement.prototype.setAttribute
  vi.spyOn(HTMLIFrameElement.prototype, 'setAttribute').mockImplementation(function (name, value) { return original.call(this, name, name === 'src' ? 'about:blank' : value) })
  const dispatch = HTMLIFrameElement.prototype.dispatchEvent
  vi.spyOn(HTMLIFrameElement.prototype, 'dispatchEvent').mockImplementation(function (event) { return event.type === 'load' ? true : dispatch.call(this, event) })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
async function setup() {
  render(<AtlasPage/>)
  const frame = await screen.findByTitle('雅思阅读练习系统') as HTMLIFrameElement
  return frame
}
describe('Atlas result boundary', () => {
  it('accepts a committed reading result from the exact same-origin iframe', async () => {
    const frame = await setup()
    fireEvent(window, new MessageEvent('message', { origin: location.origin, source: frame.contentWindow, data: receipt }))
    expect(addLearningRecord).toHaveBeenCalledWith(expect.objectContaining({ id: 'atlas:genuine-result', correct: 8, total: 13, kind: 'reading', xp: 30 }))
    expect(screen.getByRole('status')).toHaveTextContent('阅读成绩已同步')
  })
  it('rejects outside windows, foreign origins, uncommitted and impossible scores', async () => {
    const frame = await setup()
    for (const options of [
      { origin: 'https://outside.example', source: frame.contentWindow, data: receipt },
      { origin: location.origin, source: window, data: receipt },
      { origin: location.origin, source: frame.contentWindow, data: { ...receipt, committed: false } },
      { origin: location.origin, source: frame.contentWindow, data: { ...receipt, score: 20 } },
      { origin: location.origin, source: frame.contentWindow, data: { ...receipt, duration: NaN } },
    ]) fireEvent(window, new MessageEvent('message', options))
    expect(addLearningRecord).not.toHaveBeenCalled()
  })
})
