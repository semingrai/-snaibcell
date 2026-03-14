import { useState } from 'react'
import Navbar from './components/Navbar'
import PatientLookup from './components/PatientLookup'
import RiskDashboard from './components/RiskDashboard'
import { patients, predictions } from './data/patients'
import './index.css'

export default function App() {
  const [isDark, setIsDark] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const patient    = selectedId ? patients[selectedId]    : null
  const prediction = selectedId ? predictions[selectedId] : null

  const bg = isDark ? 'bg-dark-bg' : 'bg-gray-50'

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${bg} ${isDark ? 'dark' : ''}`}>
      <Navbar
        title={patient ? 'Live Risk Analysis' : 'Patient Lookup'}
        isDark={isDark}
        onToggleDark={() => setIsDark(d => !d)}
        showTimer={!!patient}
        elapsedMin={patient ? undefined : undefined}
      />

      {patient && prediction ? (
        <RiskDashboard
          patient={patient}
          prediction={prediction}
          isDark={isDark}
          onNewPatient={() => setSelectedId(null)}
        />
      ) : (
        <PatientLookup
          isDark={isDark}
          onSelect={setSelectedId}
        />
      )}
    </div>
  )
}
