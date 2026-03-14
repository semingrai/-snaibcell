import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, ReferenceArea,
} from 'recharts'
import type { PredictionOutput } from '../data/patients'
import { consequenceText } from '../data/patients'

interface Props {
  prediction: PredictionOutput
  elapsedMin: number
  isDark: boolean
}

interface TooltipPayload {
  active?: boolean
  label?: number
}

function CustomTooltip({ active, label, isDark }: TooltipPayload & { isDark: boolean }) {
  if (!active || label === undefined) return null

  const minutes = label
  const curve = (window as any).__curveData as { minutes: number; bad_outcome_prob: number }[]
  const nearest = curve?.reduce((a, b) =>
    Math.abs(b.minutes - minutes) < Math.abs(a.minutes - minutes) ? b : a
  )
  const badOutcome = nearest?.bad_outcome_prob ?? 0
  const consequence = consequenceText(badOutcome)

  const bg     = isDark ? '#0F1929' : '#FFFFFF'
  const border = isDark ? '#1E3050' : '#C5D0DC'
  const textP  = isDark ? '#E6EDF3' : '#0F1521'
  const textM  = isDark ? '#8B949E' : '#57606A'

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 6,
      padding: '10px 14px',
      width: 190,
      fontSize: 11,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ color: textP, fontWeight: 700, fontSize: 13 }}>{minutes} MIN</span>
        <span style={{ color: textM, fontSize: 10 }}>cursor</span>
      </div>
      <div style={{ height: 1, background: border, marginBottom: 8 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: textM }}>BAD OUTCOME</span>
        <span style={{ color: '#D29922', fontWeight: 700, fontSize: 12 }}>{badOutcome}%</span>
      </div>
      <div style={{ color: textM, fontSize: 9, marginBottom: 2 }}>CONSEQUENCE</div>
      <div style={{ color: textP, lineHeight: 1.4 }}>{consequence}</div>
    </div>
  )
}

export default function RiskChart({ prediction, elapsedMin, isDark }: Props) {
  // Store curve data for tooltip access
  ;(window as any).__curveData = prediction.time_curve

  const safe      = prediction.safe_duration_min
  const predicted = prediction.predicted_duration_min

  const gridColor   = isDark ? '#21262D' : '#E5E7EB'
  const axisColor   = isDark ? '#8B949E' : '#9CA3AF'
  const chartBg     = isDark ? '#090D16' : '#F0F4FA'

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Chart */}
      <div
        className="w-full rounded-lg overflow-hidden"
        style={{ height: 300, background: chartBg }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={prediction.time_curve}
            margin={{ top: 16, right: 20, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />

            <XAxis
              dataKey="minutes"
              type="number"
              domain={[0, 180]}
              ticks={[0, 30, 60, 90, 120, 150, 180]}
              tickFormatter={v => v === 0 ? '0' : `${v}m`}
              tick={{ fill: axisColor, fontSize: 9 }}
              axisLine={{ stroke: gridColor }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={v => `${v}%`}
              tick={{ fill: axisColor, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={38}
            />

            {/* Coloured zones */}
            <ReferenceArea x1={0} x2={safe} fill="#3FB950" fillOpacity={0.06} />
            <ReferenceArea x1={safe} x2={180} fill="#F85149" fillOpacity={0.06} />

            {/* Vertical markers */}
            <ReferenceLine
              x={safe}
              stroke="#3FB950"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{ value: 'Safe', position: 'insideTopRight', fill: '#3FB950', fontSize: 9 }}
            />
            <ReferenceLine
              x={predicted}
              stroke="#F85149"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{ value: 'Predicted', position: 'insideTopRight', fill: '#F85149', fontSize: 9 }}
            />
            <ReferenceLine
              x={elapsedMin}
              stroke="#D29922"
              strokeWidth={2}
              label={{ value: `Now ${elapsedMin}m`, position: 'insideTopLeft', fill: '#D29922', fontSize: 9 }}
            />

            {/* S-curve line */}
            <Line
              type="monotone"
              dataKey="bad_outcome_prob"
              stroke="#4A9EFF"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#fff', stroke: '#4A9EFF', strokeWidth: 2 }}
            />

            <Tooltip
              content={<CustomTooltip isDark={isDark} />}
              cursor={{ stroke: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)', strokeWidth: 1 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 flex-wrap">
        {[
          { color: '#4A9EFF', label: 'Bad Outcome Probability', dashed: false },
          { color: '#3FB950', label: `Safe Limit (${safe} min)`,      dashed: true  },
          { color: '#F85149', label: `Predicted (${predicted} min)`,   dashed: true  },
          { color: '#D29922', label: `Elapsed (${elapsedMin} min)`,    dashed: false },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <svg width="20" height="2">
              <line x1="0" y1="1" x2="20" y2="1"
                stroke={l.color} strokeWidth="2"
                strokeDasharray={l.dashed ? '4 3' : undefined}
              />
            </svg>
            <span className={`text-[11px] ${isDark ? 'text-txt-muted' : 'text-gray-500'}`}>
              {l.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
