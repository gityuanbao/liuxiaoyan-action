import { Component, type ReactNode } from 'react'

/** A failed route download must not leave the player on an empty screen. */
export class JourneyLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <main className="journey-loading" role="alert"><span aria-hidden="true">✧</span><h2>航路暂时被迷雾遮住了</h2><p>请检查网络，再重新载入。已保存的旅途仍留在此浏览器。</p><button className="gal-button" onClick={() => window.location.reload()}>重新载入旅途</button></main>
    return this.props.children
  }
}
