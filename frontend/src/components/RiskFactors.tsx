import { ShieldAlert, Sparkles } from 'lucide-react'
import type { PredictionOutput } from '../data/patients'

interface Props {
  prediction: PredictionOutput
  isDark: boolean
}

export default function RiskFactors({ prediction, isDark }: Props) {
  const textP   = isDark ? 'text-txt-primary' : 'text-gray-900'
  const textM   = isDark ? 'text-txt-muted'   : 'text-gray-500'
  const divider = isDark ? 'bg-dark-border'   : 'bg-gray-200'
  const barBg   = isDark ? 'bg-dark-bar'      : 'bg-gray-100'

  const urgColor = {
    RED:    'text-brand-red',
    YELLOW: 'text-brand-amber',
    GREEN:  'text-brand-green',
  }[prediction.urgency_tier]

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
              <div className={`w-full h-1.5 rounded-full ${barBg}`}>
                <div
                  className={`h-1.5 rounded-full ${barColor} opacity-90 transition-all duration-700`}
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
      <button className="flex items-center justify-center gap-2 h-11 bg-brand-blue text-white
                         text-sm font-semibold w-full hover:bg-blue-500 transition-colors">
        <Sparkles size={15} />
        Generate Clinical Brief
      </button>
    </div>
  )
}
