import { useState, useEffect, useRef } from 'react'

// Tick rate: every TICK_MS real milliseconds the clock advances by `speed` sim-seconds.
// speed=6  → 1800 sim-secs in 300 real-secs  (5 min)
// speed=12 → 1800 sim-secs in 150 real-secs  (2.5 min)
// speed=3  → 1800 sim-secs in 600 real-secs  (10 min)
const TICK_MS = 1000

export function useSimulation() {
  const [simSecond, setSimSecond] = useState(0)
  const [speed, setSpeed] = useState(6)   // 0=paused, 3=slow, 6=normal, 12=fast
  const [flights, setFlights] = useState([])
  // Keep a ref so the fetch effect always reads the latest simSecond without re-subscribing
  const simRef = useRef(0)
  useEffect(() => { simRef.current = simSecond }, [simSecond])

  // Advance clock
  useEffect(() => {
    if (speed === 0) return
    const id = setInterval(() => {
      setSimSecond(s => {
        const next = s + speed
        // Loop back to start when the day is done
        return next > 1800 ? 0 : next
      })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [speed])

  // Poll /api/map every 1.5 s — faster than before so planes feel responsive
  useEffect(() => {
    let cancelled = false
    async function fetchFlights() {
      try {
        const res = await fetch(`/api/map?sec=${simRef.current}`)
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) setFlights(data)
      } catch { /* ignore network errors during dev */ }
    }
    fetchFlights()
    const id = setInterval(fetchFlights, 1500)
    return () => { cancelled = true; clearInterval(id) }
  }, []) // intentionally empty — uses ref to always get current second

  return { simSecond, speed, setSpeed, flights, setSimSecond }
}
