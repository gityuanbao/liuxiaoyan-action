import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WpmChart } from '../WpmChart'

describe('WpmChart', () => {
  it('can gain and lose enough samples to draw without changing hook order', () => {
    const view = render(<WpmChart data={[]} />)
    expect(screen.queryByTestId('wpm-sparkline')).not.toBeInTheDocument()
    view.rerender(<WpmChart data={[20, 40]} />)
    expect(screen.getByTestId('wpm-sparkline')).toBeInTheDocument()
    view.rerender(<WpmChart data={[20]} />)
    expect(screen.queryByTestId('wpm-sparkline')).not.toBeInTheDocument()
    view.rerender(<WpmChart data={[20, 40, 60]} />)
    expect(screen.getByTestId('wpm-sparkline')).toBeInTheDocument()
  })
})
