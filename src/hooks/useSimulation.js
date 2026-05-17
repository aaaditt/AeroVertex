import { useState, useEffect } from 'react'

export function useSimulation() {
  const [simSecond, setSimSecond] = useState(0)
  const [speed, setSpeed] = useState(1)   // 0=paused, 1=normal, 2=fast
  const [flights, setFlights] = useState([])

  // Advance clock
  useEffect(() => {
    if (speed === 0) return
    const id = setInterval(() => {
      setSimSecond(s => Math.min(s + speed, 1800))
    }, 1000)
    return () => clearInterval(id)
  }, [speed])

  // Poll /api/map every 2 s
  useEffect(() => {
    let cancelled = false
    async function fetchFlights() {
      try {
        const res = await fetch(`/api/map?sec=${simSecond}`)
        const data = await res.json()
        if (!cancelled) setFlights(data)
      } catch { /* ignore */ }
    }
    fetchFlights()
    const id = setInterval(fetchFlights, 2000)
    return () => { cancelled = true; clearInterval(id) }
  }, [simSecond])

  return { simSecond, speed, setSpeed, flights, setSimSecond }
}
