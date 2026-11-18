import { useEffect, useRef, useState } from 'react'

/** Keep the stage intact until a complete decoded image is available. */
export function ArrivalArt({ src, className, alt = '', priority = false, onState }: {
  src: string; className: string; alt?: string; priority?: boolean; onState?: (state: 'loading' | 'ready' | 'error') => void
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const image = useRef<HTMLImageElement>(null)
  const report = useRef(onState); report.current = onState
  useEffect(() => { setState('loading'); report.current?.('loading') }, [src, attempt])
  function update(next: 'ready' | 'error') { setState(next); report.current?.(next) }
  async function loaded(element: HTMLImageElement) {
    try { await element.decode() } catch { /* Some browsers reject decode on an already decoded image. */ }
    if (image.current !== element) return
    update(element.naturalWidth > 0 ? 'ready' : 'error')
  }
  return <div className={`${className} arrival-art arrival-${state}`}>
    <img key={`${src}-${attempt}`} ref={image} src={src} alt={alt} decoding="async" {...{ fetchpriority: priority ? 'high' : 'auto' }}
      onLoad={e => void loaded(e.currentTarget)} onError={() => update('error')}/>
    {state === 'error' && <button className="arrival-retry" onClick={() => { setState('loading'); setAttempt(n => n + 1) }}>重新载入{alt || '画面'}</button>}
  </div>
}
