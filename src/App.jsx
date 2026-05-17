import { useState } from 'react'
import Shell from './components/Layout/Shell'
import AirportMap from './components/Map/AirportMap'
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
  const [simSpeed, setSimSpeed] = useState(1)
  const [simSecond, setSimSecond] = useState(0)
  const [selectedItem, setSelectedItem] = useState(null)

  function renderModule() {
    switch (activeModule) {
      case 'map':
        return (
          <AirportMap
            onSelectFlight={id => setSelectedItem({ type: 'flight', id })}
            onSelectGate={id => setSelectedItem({ type: 'gate', id })}
            onSelectCargo={() => setSelectedItem({ type: 'cargo' })}
            onSelectTower={() => setSelectedItem({ type: 'tower' })}
            onSelectAirport={() => setSelectedItem({ type: 'airport' })}
          />
        )
      case 'atc':     return <PlaceholderModule label="ATC CONTROL" />
      case 'cargo':   return <PlaceholderModule label="CARGO OPS" />
      case 'airport': return <PlaceholderModule label="AIRPORT ADMIN" />
      case 'boards':  return <PlaceholderModule label="FLIGHT BOARDS" />
      case 'stats':   return <PlaceholderModule label="STATISTICS" />
      default:        return null
    }
  }

  return (
    <Shell
      activeModule={activeModule}
      onNavigate={setActiveModule}
      currentSimSecond={simSecond}
      flightCount={0}
      simSpeed={simSpeed}
      onSetSpeed={setSimSpeed}
    >
      {renderModule()}
    </Shell>
  )
}
