import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Shell({
  activeModule,
  onNavigate,
  currentSimSecond,
  flightCount,
  simSpeed,
  onSetSpeed,
  children,
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#f5f5f0',
      overflow: 'hidden',
    }}>
      <TopBar
        currentSimSecond={currentSimSecond}
        flightCount={flightCount}
        simSpeed={simSpeed}
        onSetSpeed={onSetSpeed}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar activeModule={activeModule} onNavigate={onNavigate} />

        <main style={{
          flex: 1,
          overflow: 'auto',
          background: '#f5f5f0',
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}
