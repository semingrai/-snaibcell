interface Props {
  elapsedMin: number
  isDark: boolean
}

export default function NeuronCounter({ elapsedMin, isDark }: Props) {
  const neurons = Math.round(elapsedMin * 1_900_000)
  const formatted = neurons.toLocaleString()
  const millionsRate = (1_900_000 / 1_000_000).toFixed(1)

  const surface  = isDark ? 'bg-dark-surface' : 'bg-white'
  const border   = isDark ? 'border-dark-card' : 'border-gray-200'
  const textM    = isDark ? 'text-txt-muted'   : 'text-gray-500'

  return (
    <div className={`flex items-center justify-between w-full px-8 py-6 border ${surface} ${border}`}>
      <div className="flex flex-col gap-1">
        <span className={`text-[10px] font-semibold tracking-widest ${textM}`}>
          NEURONS LOST SINCE PROCEDURE START
        </span>
        <span className="text-[44px] font-bold leading-none text-brand-red font-mono tabular-nums">
          {formatted}
        </span>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <span className="text-[22px] font-semibold text-brand-red">{millionsRate}M / min</span>
        <span className={`text-sm ${textM}`}>neurons lost per minute</span>
        <span className={`text-[10px] ${textM} opacity-40`}>Saver, 2006 — JAMA</span>
      </div>
    </div>
  )
}
