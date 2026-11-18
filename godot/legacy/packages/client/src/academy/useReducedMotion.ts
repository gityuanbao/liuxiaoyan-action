import { useEffect, useState } from 'react'
import { useGameStore } from '../store'
export function useReducedMotion() {
  const preference = useGameStore(s => s.reducedMotion)
  const [system, setSystem] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!media) return
    const change = () => setSystem(media.matches)
    media.addEventListener?.('change', change)
    return () => media.removeEventListener?.('change', change)
  }, [])
  return preference || system
}
