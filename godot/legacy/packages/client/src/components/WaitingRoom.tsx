import { Icon, PageEmblem } from '../academy/Icon'
import { useState } from 'react'
import { useGameStore } from '../store'
import { useWebSocket } from '../hooks/useWebSocket'

export function WaitingRoom() {
  const { roomCode, reset } = useGameStore()
  const { disconnect } = useWebSocket()
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    if (!roomCode) return

    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access may be unavailable in non-HTTPS dev contexts.
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-surface border border-border rounded-lg p-8 w-full max-w-md text-center">
        <PageEmblem name="lobby"/><h2 className="text-2xl font-bold text-accent mb-4">房间已创建</h2>
        <p className="text-text/60 mb-2">将房间码分享给好友，一起对战：</p>
        <button
          onClick={handleCopyCode}
          className="w-full text-4xl font-bold tracking-[0.3em] text-accent bg-bg border border-border rounded p-4 mb-2 hover:border-accent/50 transition-colors cursor-pointer"
          title="点击复制房间码"
          data-testid="room-code"
        >
          {roomCode ?? '......'}
        </button>
        <p className="text-xs text-text/30 mb-4">
          <Icon name={copied ? 'check' : 'copy'} size={18}/>{copied ? '已复制！' : '点击复制房间码'}
        </p>
        <p className="text-text/40 text-sm">等待好友加入…</p>
        <div className="mt-4 flex justify-center">
          <span className="inline-block w-2 h-2 bg-accent rounded-full animate-pulse" />
        </div>

        <button
          onClick={() => {
            disconnect()
            reset()
          }}
          className="mt-6 w-full border border-text/20 text-text/60 font-bold py-2 rounded hover:border-accent/50 hover:text-accent transition-colors"
        >
          返回大厅
        </button>
      </div>
    </div>
  )
}
