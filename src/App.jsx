import { useState, useEffect } from 'react'
import Shell from './components/Layout/Shell'
import AirportMap from './components/Map/AirportMap'
import FlightDetail from './components/Panels/FlightDetail'
import ATCConsole from './components/Panels/ATCConsole'
import CargoModule from './components/Panels/CargoModule'
import AirportPanel from './components/Panels/AirportPanel'
import BoardsPanel from './components/Panels/BoardsPanel'
import AnalyticsDashboard from './components/Panels/AnalyticsDashboard'
import { useSimulation } from './hooks/useSimulation'
import './App.css'

export default function App() {
  const [activeModule, setActiveModule] = useState('map')
  const [selectedItem, setSelectedItem] = useState(null)

  const { simSecond, speed, setSpeed, flights, simRef } = useSimulation()

  // Keyboard shortcuts: Space=pause/resume, 1=3×, 2=6×, 3=12×
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return
      if (e.code === 'Space')  { e.preventDefault(); setSpeed(s => s === 0 ? 6 : 0) }
      if (e.key  === '1')      setSpeed(3)
      if (e.key  === '2')      setSpeed(6)
      if (e.key  === '3')      setSpeed(12)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSpeed])

  function renderModule() {
    switch (activeModule) {
      case 'map':
        return (
          <AirportMap
            flights={flights}
            simRef={simRef}
            onSelectFlight={id => setSelectedItem({ type: 'flight', id })}
            onSelectGate={id => setSelectedItem({ type: 'gate', id })}
            onSelectCargo={() => setActiveModule('cargo')}
            onSelectTower={() => setActiveModule('atc')}
            onSelectAirport={() => setActiveModule('airport')}
          />
        )
      case 'atc':     return <ATCConsole />
      case 'cargo':   return <CargoModule />
      case 'airport': return <AirportPanel />
      case 'boards':  return <BoardsPanel />
      case 'stats':   return <AnalyticsDashboard />
      default:        return null
    }
  }

  return (
    <>
      <Shell
        activeModule={activeModule}
        onNavigate={setActiveModule}
        currentSimSecond={simSecond}
        flightCount={flights.length}
        simSpeed={speed}
        onSetSpeed={setSpeed}
      >
        {renderModule()}
      </Shell>
      <FlightDetail
        flightId={selectedItem?.type === 'flight' ? selectedItem.id : null}
        simSecond={simSecond}
        onClose={() => setSelectedItem(null)}
      />
    </>
  )
}
