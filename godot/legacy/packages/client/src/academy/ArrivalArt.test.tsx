import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ArrivalArt } from './ArrivalArt'

describe('arrival artwork', () => {
  it('waits for decoding before displaying the complete image', async () => {
    let decoded!: () => void
    const report = vi.fn()
    const { container } = render(<ArrivalArt src="/hero.webp" className="portrait" onState={report}/>)
    const image = container.querySelector('img')!
    Object.defineProperty(image, 'naturalWidth', { value: 900 })
    image.decode = () => new Promise<void>(resolve => { decoded = resolve })
    fireEvent.load(image)
    expect(container.firstChild).toHaveClass('arrival-loading')
    decoded()
    await waitFor(() => expect(container.firstChild).toHaveClass('arrival-ready'))
    expect(report).toHaveBeenLastCalledWith('ready')
  })
  it('offers a retry after an image failure without blocking the menu', () => {
    const { container } = render(<><button>继续旅途</button><ArrivalArt src="/hero.webp" className="portrait"/></>)
    const old = container.querySelector('img')!
    fireEvent.error(old)
    expect(screen.getByRole('button', { name: '继续旅途' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: '重新载入画面' }))
    expect(container.querySelector('img')).not.toBe(old)
    expect(container.querySelector('.portrait')).toHaveClass('arrival-loading')
  })
})
