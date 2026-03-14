import { useState } from 'react'
import { ShieldAlert, Sparkles, Loader2 } from 'lucide-react'
import type { PredictionOutput } from '../data/patients'

interface Props {
  prediction: PredictionOutput
  isDark: boolean
}

export default function RiskFactors({ prediction, isDark }: Props) {
  const [briefLoading, setBriefLoading] = useState(false)
  const [brief, setBrief] = useState<string | null>(null)
  const [briefError, setBriefError] = useState<string | null>(null)

  const textP   = isDark ? 'text-txt-primary' : 'text-gray-900'
  const textM   = isDark ? 'text-txt-muted'   : 'text-gray-500'
  const divider = isDark ? 'bg-dark-border'   : 'bg-gray-200'
  const barBg   = isDark ? 'bg-dark-bar'      : 'bg-gray-100'
  const surface = isDark ? 'bg-dark-surface border-dark-card' : 'bg-gray-50 border-gray-200'

  const urgColor = {
    RED:    'text-brand-red',
    YELLOW: 'text-brand-amber',
    GREEN:  'text-brand-green',
  }[prediction.urgency_tier]

  const handleGenerateBrief = async () => {
    setBriefLoading(true)
    setBrief(null)
    setBriefError(null)

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) {
      setBriefError('Set VITE_ANTHROPIC_API_KEY in your .env.local file.')
      setBriefLoading(false)
      return
    }

    const featLines = prediction.top_features
      .map(f => `  - ${f.label}: ${f.direction === 'up' ? '↑ increases' : '↓ decreases'} risk (weight ${f.weight}%)`)
      .join('\n')

    const prompt = `You are a stroke intervention clinical decision support AI. Generate a concise clinical handoff brief (3–4 sentences) based on the following prediction data:

Urgency tier: ${prediction.urgency_tier}
Predicted mRS: ${prediction.predicted_mrs} — ${prediction.mrs_plain_english}
Independence probability: ${prediction.independence_prob}%
Time window remaining: ${prediction.time_window_minutes} min
Predicted procedure duration: ${prediction.predicted_duration_min} min (safe limit: ${prediction.safe_duration_min} min)
Key risk drivers:
${featLines}

Write a direct, clinical summary suitable for rapid handoff. Include urgency, prognosis, key risk factors, and any time pressure. No bullet points — flowing sentences only.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-allow-browser': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      if (data.content?.[0]?.text) {
        setBrief(data.content[0].text)
      } else {
        setBriefError(data.error?.message ?? 'Unexpected API response.')
      }
    } catch {
      setBriefError('Network error — check your API key and connection.')
    } finally {
      setBriefLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className={`text-base font-semibold ${textP}`}>Top Risk Factors</h2>
        <p className={`text-xs ${textM}`}>Drivers of extended procedure time</p>
      </div>

      <div className={`h-px w-full ${divider}`} />

      {/* Bars */}
      <div className="flex flex-col gap-5">
        {prediction.top_features.map((f, i) => {
          const isUp = f.direction === 'up'
          const barColor = isUp
            ? i < 2 ? 'bg-brand-red' : 'bg-brand-amber'
            : 'bg-brand-green'
          const labelColor = isUp
            ? i < 2 ? 'text-brand-red' : 'text-brand-amber'
            : 'text-brand-green'

          return (
            <div key={f.label} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${textP}`}>{f.label}</span>
                <span className={`text-[11px] ${labelColor}`}>
                  {isUp ? '↑' : '↓'} {isUp ? 'Increases' : 'Decreases'} risk
                </span>
              </div>
              <div className={`w-full h-1.5 ${barBg}`}>
                <div
                  className={`h-1.5 ${barColor} opacity-90 transition-all duration-700`}
                  style={{ width: `${f.weight}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer divider */}
      <div className={`h-px w-full ${divider} mt-auto`} />

      {/* Predicted time */}
      <div className="flex flex-col gap-2">
        <span className={`text-[10px] font-semibold tracking-widest ${textM}`}>
          PREDICTED PROCEDURE TIME
        </span>
        <span className={`text-3xl font-bold ${urgColor}`}>
          {prediction.predicted_duration_min} minutes
        </span>
        <div className="flex items-center gap-2">
          <ShieldAlert size={15} className="text-brand-amber shrink-0" />
          <span className="text-xs text-brand-amber">
            Safe limit: {prediction.safe_duration_min} min
            {' '}— {prediction.predicted_duration_min - prediction.safe_duration_min} min over threshold
          </span>
        </div>
      </div>

      {/* AI Brief button */}
      <button
        onClick={handleGenerateBrief}
        disabled={briefLoading}
        className="flex items-center justify-center gap-2 h-11 bg-brand-blue text-white
                   text-sm font-semibold w-full hover:bg-blue-500 transition-colors disabled:opacity-60"
      >
        {briefLoading
          ? <Loader2 size={15} className="animate-spin" />
          : <Sparkles size={15} />
        }
        {briefLoading ? 'Generating...' : 'Generate Clinical Brief'}
      </button>

      {/* Brief output */}
      {brief && (
        <div className={`text-xs leading-relaxed p-3 border ${surface} ${textP}`}>
          {brief}
        </div>
      )}
      {briefError && (
        <p className="text-xs text-brand-red">{briefError}</p>
      )}
    </div>
  )
}
