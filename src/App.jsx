import AirportHero from './AirportHero'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-logo">✈ AeroVertex</span>
        <span className="app-tagline">Airport Management System</span>
        <span className="app-badge">v0.1 — Building</span>
      </header>

      <main className="app-main">
        <AirportHero />
      </main>

      <footer className="app-footer">
        <span>Runways · Gates · Cargo · Flights · Ground Services</span>
      </footer>
    </div>
  )
}

export default App
