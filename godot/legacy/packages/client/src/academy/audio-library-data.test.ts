import { beforeEach, describe, expect, it } from 'vitest'
import { AUDIO_SHELF_KEY, HUMAN_CLIPS, humanClip, readAudioShelf, validateAudioFile, writeAudioShelf } from './audio-library-data'
import { WORDS } from './words'
beforeEach(() => localStorage.clear())
describe('human voices and local audio library', () => {
  it('only exposes licensed, attributed recordings matching playable words', () => {
    expect(HUMAN_CLIPS.length).toBeGreaterThanOrEqual(6)
    for (const clip of HUMAN_CLIPS) { expect(WORDS.some(w => w.word === clip.word)).toBe(true); expect(clip.author).toBeTruthy(); expect(clip.license).toBe('CC BY-SA 3.0'); expect(clip.sha256).toMatch(/^[a-f0-9]{64}$/); expect(humanClip(clip.word)?.file).toMatch(/^\/audio\/human-v1\/[a-z]+\.ogg$/) }
  })
  it('rejects empty, oversize and nonaudio imports before storing them', () => {
    for (const file of [{ name: 'a.mp3', type: 'audio/mpeg', size: 0 }, { name: 'a.mp3', type: 'audio/mpeg', size: 81 * 1024 * 1024 }, { name: 'a.html', type: 'text/html', size: 50 }, { name: 'a.wav', type: 'text/html', size: 50 }]) expect(() => validateAudioFile(file)).toThrow()
    expect(() => validateAudioFile({ name: 'lesson.MP3', type: '', size: 1024 })).not.toThrow()
  })
  it('persists notes and rejects corrupt metadata instead of losing the shelf', () => {
    const track = { id: 'library:test', title: 'Practice', filename: 'practice.mp3', type: 'audio/mpeg', bytes: 1024, seconds: 60, date: new Date().toISOString(), notes: 'A difficult word' }
    writeAudioShelf([track]); expect(readAudioShelf()).toEqual([track])
    localStorage.setItem(AUDIO_SHELF_KEY, JSON.stringify([{ ...track, seconds: -1 }])); expect(() => readAudioShelf()).toThrow()
  })
})
