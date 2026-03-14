import { useState } from 'react'
import { Search, Activity } from 'lucide-react'
import { demoChips, patients } from '../data/patients'

interface Props {
  isDark: boolean
  onSelect: (id: string) => void
}

const chipColors = {
  red:   { bg: 'bg-red-500/10',    border: 'border-red-500/40',   text: 'text-brand-red'   },
  amber: { bg: 'bg-amber-500/10',  border: 'border-amber-500/40', text: 'text-brand-amber' },
  green: { bg: 'bg-green-500/10',  border: 'border-green-500/40', text: 'text-brand-green' },
}

export default function PatientLookup({ isDark, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = query.trim().toUpperCase()
    if (patients[id]) {
      setError('')
      onSelect(id)
    } else {
      setError(`Patient "${id}" not found. Try: ST0001, ST0009, ST0014, ST0045`)
    }
  }

  const bg      = isDark ? 'bg-dark-bg'      : 'bg-gray-50'
  const surface = isDark ? 'bg-dark-surface' : 'bg-white'
  const border  = isDark ? 'border-dark-card' : 'border-gray-200'
  const textPrimary = isDark ? 'text-txt-primary' : 'text-gray-900'
  const textMuted   = isDark ? 'text-txt-muted'   : 'text-gray-500'
  const inputBg     = isDark ? 'bg-dark-input'    : 'bg-gray-100'

  return (
    <div className={`flex flex-col items-center justify-center flex-1 ${bg}`}>
      {/* Brand */}
      <div className="flex flex-col items-center gap-3 mb-14">
        <div className="w-[72px] h-[72px] rounded-[18px] bg-gradient-to-br from-blue-700 to-blue-950
                        flex items-center justify-center shadow-lg shadow-blue-900/30">
          <Activity size={36} className="text-brand-lblue" />
        </div>
        <h1 className={`text-5xl font-bold tracking-tight ${textPrimary}`}>StrokeGuard</h1>
        <p className={`text-base ${textMuted}`}>AI-Powered Stroke Intervention Analysis</p>
      </div>

      {/* Search card */}
      <form
        onSubmit={handleSubmit}
        className={`w-[560px] rounded-2xl p-10 flex flex-col gap-5 border ${surface} ${border}`}
      >
        <p className={`text-sm ${textMuted}`}>Enter Patient ID to load risk profile</p>

        {/* Input */}
        <div className={`flex items-center gap-3 h-14 px-5 ${inputBg} border
          ${isDark ? 'border-brand-blue/20' : 'border-gray-300'}`}>
          <Search size={20} className={textMuted} />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setError('') }}
            placeholder="e.g.  ST0001, ST0009, ST0014..."
            className={`flex-1 bg-transparent outline-none text-[15px] font-mono
              placeholder:opacity-40 ${textPrimary} placeholder:${textMuted}`}
          />
        </div>

        {error && <p className="text-brand-red text-sm font-mono">{error}</p>}

        {/* Button */}
        <button
          type="submit"
          className="h-[52px] bg-brand-blue text-white text-[15px] font-semibold
                     hover:bg-blue-500 transition-colors"
        >
          Analyze Patient
        </button>
      </form>

      {/* Demo chips */}
      <div className="flex flex-col items-center gap-4 mt-14">
        <p className={`text-sm ${textMuted}`}>Quick Demo Patients</p>
        <div className="flex gap-3">
          {demoChips.map(chip => {
            const c = chipColors[chip.color]
            return (
              <button
                key={chip.id}
                onClick={() => onSelect(chip.id)}
                className={`flex items-center gap-2 px-4 py-[10px] rounded-full border text-xs font-mono
                  transition-opacity hover:opacity-80 ${c.bg} ${c.border} ${c.text}`}
              >
                {chip.id} · {chip.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
