import { useState } from 'react'
import Shell from './components/Layout/Shell'
import AirportMap from './components/Map/AirportMap'
import FlightDetail from './components/Panels/FlightDetail'
import ATCConsole from './components/Panels/ATCConsole'
import CargoModule from './components/Panels/CargoModule'
import { useSimulation } from './hooks/useSimulation'
import './App.css'

const PLACEHOLDER_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: '#4b7fbd',
  fontFamily: 'monospace',
  fontSize: 14,
  letterSpacing: 2,
}

function PlaceholderModule({ label }) {
  return <div style={PLACEHOLDER_STYLE}>{label} — Coming in Session 5+</div>
}

export default function App() {
  const [activeModule, setActiveModule] = useState('map')
  const [selectedItem, setSelectedItem] = useState(null)

  const { simSecond, speed, setSpeed, flights, setSimSecond } = useSimulation()

  function renderModule() {
    switch (activeModule) {
      case 'map':
        return (
          <AirportMap
            flights={flights}
            simSecond={simSecond}
            onSelectFlight={id => setSelectedItem({ type: 'flight', id })}
            onSelectGate={id => setSelectedItem({ type: 'gate', id })}
            onSelectCargo={() => setActiveModule('cargo')}
            onSelectTower={() => setActiveModule('atc')}
            onSelectAirport={() => setSelectedItem({ type: 'airport' })}
          />
        )
      case 'atc':     return <ATCConsole />
      case 'cargo':   return <CargoModule />
      case 'airport': return <PlaceholderModule label="AIRPORT ADMIN" />
      case 'boards':  return <PlaceholderModule label="FLIGHT BOARDS" />
      case 'stats':   return <PlaceholderModule label="STATISTICS" />
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
        onClose={() => setSelectedItem(null)}
      />
    </>
  )
}
