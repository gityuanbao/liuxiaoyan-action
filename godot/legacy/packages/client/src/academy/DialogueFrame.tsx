import { optimizedArt } from './optimized-art'
import type { CSSProperties, ReactNode } from 'react'
import { CHARACTERS, type AvatarId } from './character-data'

export function DialogueFrame({ avatar, name, role, side = 'left', className = '', children }: {
  avatar: AvatarId; name: string; role: string; side?: 'left' | 'right'; className?: string; children: ReactNode
}) {
  return <section className={`gal-dialogue dialogue-frame voice-${side} ${className}`} style={{ '--voice-tint': CHARACTERS[avatar].color } as CSSProperties}>
    <svg className="dialogue-filigree" viewBox="0 0 1000 180" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path d="M22 1H431l17 7h104l17-7h409l21 21v136l-21 21H22L1 158V22Z"/>
      <path d="M31 7H421M579 7h390l23 23v119l-23 23H579M421 172H31L8 149V31" opacity=".35"/>
      <path d="m477 3 23 10 23-10M483 173l17-10 17 10m-493-17 7-9 9 9-9 8Zm0-132 7-9 9 9-9 8Zm952 0-7-9-9 9 9 8Zm0 132-7-9-9 9 9 8Z"/>
      <path d="M44 22h45m-37-5 9 5-9 5m-8 128h45m-37-5 9 5-9 5M956 22h-45m37-5-9 5 9 5m8 128h-45m37-5-9 5 9 5" opacity=".6"/>
    </svg>
    <header className="dialogue-identity"><div className="voice-medallion"><img src={optimizedArt(`/art/galgame/${avatar}-avatar.png`)} alt=""/><span aria-hidden="true">✦</span></div><div className="voice-name"><b>{name}</b><small>{role}</small></div><span className="voice-flourish" aria-hidden="true">◇</span></header>
    <div className="dialogue-frame-content">{children}</div>
  </section>
}
