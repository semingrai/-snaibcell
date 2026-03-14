import { useState } from "react";
import { Search } from "lucide-react";
import { demoChips, patients, predictions } from "../data/patients";

interface Props {
  isDark: boolean;
  onSelect: (id: string) => void;
}

const urgencyOrder = { red: 0, amber: 1, green: 2 } as const;

const urgencyStyle = {
  red:   { indicator: "bg-red-500",   label: "text-red-500",   badge: "bg-red-500/10 text-red-500"   },
  amber: { indicator: "bg-amber-400", label: "text-amber-400", badge: "bg-amber-400/10 text-amber-400" },
  green: { indicator: "bg-green-500", label: "text-green-500", badge: "bg-green-500/10 text-green-500" },
};

const urgencyBar = {
  red:   "bg-red-500",
  amber: "bg-amber-400",
  green: "bg-green-500",
};

const urgencyWindow = {
  red:   "bg-red-500/10",
  amber: "bg-amber-400/10",
  green: "bg-green-500/10",
};

const sortedPatients = [...demoChips].sort(
  (a, b) => urgencyOrder[a.color] - urgencyOrder[b.color]
);

// Build sequential schedule: each patient starts after the previous one ends
function buildSchedule() {
  let cursor = 0;
  return sortedPatients.map((chip) => {
    const pred = predictions[chip.id];
    const start = cursor;
    const end = cursor + pred.predicted_duration_min;
    cursor = end;
    return { chip, pred, patient: patients[chip.id], start, end };
  });
}

const schedule = buildSchedule();
const totalScheduleMin = schedule[schedule.length - 1].end;

export default function PatientLookup({ isDark, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = query.trim().toUpperCase();
    if (patients[id]) {
      setError("");
      onSelect(id);
    } else {
      setError(`Patient "${id}" not found.`);
    }
  };

  const bg      = isDark ? "bg-dark-bg"      : "bg-gray-50";
  const surface = isDark ? "bg-dark-surface" : "bg-white";
  const border  = isDark ? "border-dark-card" : "border-gray-200";
  const textPrimary = isDark ? "text-txt-primary" : "text-gray-900";
  const textMuted   = isDark ? "text-txt-muted"   : "text-gray-500";
  const inputBg     = isDark ? "bg-dark-input"    : "bg-gray-100";
  const cardHover   = isDark ? "hover:bg-dark-input" : "hover:bg-gray-50";
  const divider     = isDark ? "bg-dark-border"  : "bg-gray-200";
  const trackBg     = isDark ? "bg-dark-input"   : "bg-gray-100";

  // Tick marks for the Gantt (every 60 min)
  const ticks: number[] = [];
  for (let t = 0; t <= totalScheduleMin; t += 60) ticks.push(t);

  return (
    <div className={`flex flex-1 gap-5 p-6 overflow-hidden ${bg}`}>

      {/* ── Column 1: Add Patient ── */}
      <div className={`w-60 flex-shrink-0 flex flex-col gap-5 h-fit rounded border p-5 ${surface} ${border}`}>
        <div>
          <h2 className={`text-sm font-semibold ${textPrimary}`}>Add Patient</h2>
          <p className={`text-xs mt-0.5 ${textMuted}`}>Enter ID to load risk profile</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className={`flex items-center gap-2 h-10 px-3 border ${inputBg} ${isDark ? "border-brand-blue/20" : "border-gray-300"}`}>
            <Search size={14} className={textMuted} />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setError(""); }}
              placeholder="e.g. ST0001"
              className={`flex-1 bg-transparent outline-none text-sm font-mono placeholder:opacity-40 ${textPrimary}`}
            />
          </div>
          {error && <p className="text-red-500 text-xs font-mono">{error}</p>}
          <button
            type="submit"
            className="h-9 bg-brand-blue text-white text-sm font-semibold hover:bg-blue-500 transition-colors"
          >
            Load Patient
          </button>
        </form>

        <div className={`h-px w-full ${divider}`} />
        <div>
          <p className={`text-xs ${textMuted} mb-2`}>Available IDs</p>
          <div className="flex flex-wrap gap-1">
            {Object.keys(patients).map((id) => (
              <span key={id} className={`text-xs font-mono px-1.5 py-0.5 ${inputBg} ${textMuted}`}>{id}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Column 2: Current Patients (narrow) ── */}
      <div className="w-52 flex-shrink-0 flex flex-col gap-3">
        <h2 className={`text-sm font-semibold ${textPrimary}`}>Current Patients</h2>
        <div className="flex flex-col gap-2">
          {sortedPatients.map((chip) => {
            const p = patients[chip.id];
            const style = urgencyStyle[chip.color];
            return (
              <button
                key={chip.id}
                onClick={() => onSelect(chip.id)}
                className={`w-full text-left border p-3 flex items-center gap-3 transition-colors ${surface} ${border} ${cardHover}`}
              >
                <div className={`w-1 self-stretch flex-shrink-0 ${style.indicator}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-mono font-semibold ${textPrimary}`}>{chip.id}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-px ${style.badge}`}>{chip.label}</span>
                  </div>
                  {p && (
                    <div className={`text-[10px] ${textMuted}`}>
                      {p.age}y · NIHSS {p.nihss_score} · {p.clot_location}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Column 3: Procedure Queue / Gantt ── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex items-baseline justify-between">
          <h2 className={`text-sm font-semibold ${textPrimary}`}>Procedure Queue</h2>
          <span className={`text-xs ${textMuted}`}>Sequential scheduling · {totalScheduleMin} min total</span>
        </div>

        <div className={`flex-1 rounded border p-5 flex flex-col gap-4 ${surface} ${border}`}>
          {/* Tick labels */}
          <div className="relative h-4 ml-28">
            {ticks.map((t) => (
              <span
                key={t}
                className={`absolute text-[10px] ${textMuted} -translate-x-1/2`}
                style={{ left: `${(t / totalScheduleMin) * 100}%` }}
              >
                {t}m
              </span>
            ))}
          </div>

          {/* Patient rows */}
          <div className="flex flex-col gap-3">
            {schedule.map(({ chip, pred, start, end }) => {
              const style = urgencyStyle[chip.color];
              const startPct = (start / totalScheduleMin) * 100;
              const widthPct = ((end - start) / totalScheduleMin) * 100;
              const windowPct = Math.min((pred.time_window_minutes / totalScheduleMin) * 100, 100);
              const pastWindow = start >= pred.time_window_minutes;

              return (
                <div key={chip.id} className="flex items-center gap-3">
                  {/* Label */}
                  <div className="w-28 flex-shrink-0 flex items-center gap-2">
                    <div className={`w-1 h-8 flex-shrink-0 ${style.indicator}`} />
                    <div>
                      <div className={`text-xs font-mono font-semibold ${textPrimary}`}>{chip.id}</div>
                      <div className={`text-[10px] ${style.label}`}>{chip.label}</div>
                    </div>
                  </div>

                  {/* Track */}
                  <div className={`relative flex-1 h-8 ${trackBg}`}>
                    {/* Time window available */}
                    <div
                      className={`absolute top-0 h-full ${urgencyWindow[chip.color]}`}
                      style={{ left: 0, width: `${windowPct}%` }}
                      title={`Window: ${pred.time_window_minutes} min`}
                    />

                    {/* Procedure bar */}
                    <div
                      className={`absolute top-1 h-6 ${urgencyBar[chip.color]} ${pastWindow ? "opacity-40" : "opacity-90"}`}
                      style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                      title={`${start}–${end} min`}
                    />

                    {/* Tick grid lines */}
                    {ticks.filter(t => t > 0).map((t) => (
                      <div
                        key={t}
                        className={`absolute top-0 h-full w-px ${divider}`}
                        style={{ left: `${(t / totalScheduleMin) * 100}%` }}
                      />
                    ))}

                    {/* Window close marker */}
                    <div
                      className={`absolute top-0 h-full w-px ${style.indicator} opacity-60`}
                      style={{ left: `${windowPct}%` }}
                      title={`Window closes at ${pred.time_window_minutes} min`}
                    />
                  </div>

                  {/* Timing info */}
                  <div className={`w-28 flex-shrink-0 text-[10px] ${textMuted}`}>
                    <div>{start}–{end} min</div>
                    <div className={pastWindow ? "text-red-500" : style.label}>
                      {pastWindow ? "⚠ outside window" : `window: ${pred.time_window_minutes}m`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className={`h-px w-full ${divider}`} />
          <div className={`flex gap-5 text-[10px] ${textMuted}`}>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-3 bg-red-500/10" />
              <span>Time window available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-3 bg-red-500 opacity-90" />
              <span>Procedure duration</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-px h-3 bg-red-500 opacity-60" />
              <span>Window closes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-3 bg-red-500 opacity-40" />
              <span>Outside window (critical)</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
