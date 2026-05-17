import { useRef, useEffect } from 'react'

export function useRAFAnimation({ speed, onTick, maxSec = 1800 }) {
  const simRef = useRef(0)
  const speedRef = useRef(speed)
  const lastTsRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => { speedRef.current = speed }, [speed])

  useEffect(() => {
    function frame(ts) {
      if (speedRef.current === 0) {
        lastTsRef.current = null
        rafRef.current = requestAnimationFrame(frame)
        return
      }
      if (lastTsRef.current !== null) {
        const dtSec = (ts - lastTsRef.current) / 1000
        simRef.current = simRef.current + speedRef.current * dtSec
        if (simRef.current > maxSec) simRef.current = 0
      }
      lastTsRef.current = ts
      onTick(simRef.current)
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [onTick, maxSec])

  return simRef
}
