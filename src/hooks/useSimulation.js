import { useState, useEffect, useRef, useCallback } from 'react'
import { useRAFAnimation } from './useRAFAnimation'

export function useSimulation() {
  const [simSecond, setSimSecond] = useState(0)
  const [speed, setSpeed] = useState(6)
  const [flights, setFlights] = useState([])

  const simApiRef = useRef(0)      // always-current sim time for fetch queries
  const lastDisplayRef = useRef(0) // real timestamp of last setState call

  // Throttle React state updates to ~4Hz so TopBar doesn't re-render 60×/s
  const onTick = useCallback((sec) => {
    simApiRef.current = sec
    const now = performance.now()
    if (now - lastDisplayRef.current >= 250) {
      lastDisplayRef.current = now
      setSimSecond(Math.floor(sec))
    }
  }, [])

  const simRef = useRAFAnimation({ speed, onTick, maxSec: 1800 })

  // Poll /api/map every 1.5s — reads simApiRef so it always uses the live sim time
  useEffect(() => {
    let cancelled = false
    async function fetchFlights() {
      try {
        const res = await fetch(`/api/map?sec=${Math.floor(simApiRef.current)}`)
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) setFlights(data)
      } catch { /* ignore network errors during dev */ }
    }
    fetchFlights()
    const id = setInterval(fetchFlights, 1500)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return { simSecond, speed, setSpeed, flights, simRef }
}
