import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  subMonths,
  subQuarters,
  startOfYear,
  subYears,
} from 'date-fns';
import 'react-day-picker/style.css';

const PRESETS = [
  { id: 'thisMonth',    label: 'Este mes' },
  { id: 'lastMonth',   label: 'El mes pasado' },
  { id: 'last3months', label: 'Últimos 3 meses' },
  { id: 'last6months', label: 'Últimos 6 meses' },
  { id: 'thisQuarter', label: 'Este trimestre' },
  { id: 'lastQuarter', label: 'El trimestre pasado' },
  { id: 'ytd',         label: 'Lo que va del año' },
  { id: 'lastYear',    label: 'El año pasado' },
  { id: 'all',         label: 'Todo el historial' },
];

function getPresetRange(id) {
  const now = new Date();
  switch (id) {
    case 'thisMonth':    return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'lastMonth': { const m = subMonths(now, 1); return { from: startOfMonth(m), to: endOfMonth(m) }; }
    case 'last3months':  return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
    case 'last6months':  return { from: startOfMonth(subMonths(now, 5)), to: endOfMonth(now) };
    case 'thisQuarter':  return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case 'lastQuarter': { const q = subQuarters(now, 1); return { from: startOfQuarter(q), to: endOfQuarter(q) }; }
    case 'ytd':          return { from: startOfYear(now), to: now };
    case 'lastYear': { const y = subYears(now, 1); return { from: startOfYear(y), to: new Date(y.getFullYear(), 11, 31) }; }
    case 'all':          return { from: null, to: null };
    default:             return { from: null, to: null };
  }
}

function formatChipLabel(dateRange) {
  if (!dateRange.from && !dateRange.to) return 'Todas las fechas';
  const now = new Date();
  const thisMonthFrom = startOfMonth(now);
  const thisMonthTo = endOfMonth(now);
  if (dateRange.from && dateRange.to) {
    if (
      dateRange.from.toDateString() === thisMonthFrom.toDateString() &&
      dateRange.to.toDateString() === thisMonthTo.toDateString()
    ) {
      return 'Este mes';
    }
    const f = format(dateRange.from, 'dd/MM/yy');
    const t = format(dateRange.to, 'dd/MM/yy');
    return `${f} → ${t}`;
  }
  if (dateRange.from) return `Desde ${format(dateRange.from, 'dd/MM/yy')}`;
  return `Hasta ${format(dateRange.to, 'dd/MM/yy')}`;
}

export default function DateFilterChip({ value, onChange, accentColor }) {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState(value);
  const [lastNDays, setLastNDays] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(value.to || value.from || new Date());
  const containerRef = useRef(null);
  const panelRef = useRef(null);

  // sync tempRange when value changes externally
  useEffect(() => { setTempRange(value); }, [value]);

  // click-outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // auto-position panel to avoid viewport overflow
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    // reset first
    panel.style.left = '0';
    panel.style.right = 'auto';
    const rect = panel.getBoundingClientRect();
    if (rect.right > window.innerWidth - 4) {
      panel.style.left = 'auto';
      panel.style.right = '0';
    }
  }, [open]);

  const apply = () => { onChange(tempRange); setOpen(false); };
  const cancel = () => { setTempRange(value); setOpen(false); };

  const applyPreset = (id) => {
    const range = getPresetRange(id);
    setTempRange(range);
    if (range.from) setCalendarMonth(range.from);
  };

  const applyLastN = () => {
    const n = parseInt(lastNDays, 10);
    if (!n || n < 1) return;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - n + 1);
    setTempRange({ from, to });
    setCalendarMonth(from);
  };

  const chipLabel = formatChipLabel(value);
  const hasFilter = value.from || value.to;
  const accent = accentColor || 'var(--accent-primary)';

  const isPresetActive = (id) => {
    const range = getPresetRange(id);
    return (
      (tempRange.from?.toDateString() === range.from?.toDateString() || (!tempRange.from && !range.from)) &&
      (tempRange.to?.toDateString() === range.to?.toDateString() || (!tempRange.to && !range.to))
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Chip */}
      <button
        onClick={() => { setTempRange(value); setOpen(!open); }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{
          backgroundColor: hasFilter ? `color-mix(in srgb, ${accent} 15%, transparent)` : 'var(--bg-tertiary)',
          color: hasFilter ? accent : 'var(--text-secondary)',
          border: `1px solid ${hasFilter ? accent : 'var(--border-subtle)'}`,
        }}
      >
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="font-medium italic" style={{ color: hasFilter ? accent : 'var(--text-secondary)' }}>
          Fecha
        </span>
        <span className="font-normal italic" style={{ color: 'var(--text-secondary)' }}>está entre</span>
        <span>{chipLabel}</span>
        <svg className="w-3 h-3 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute top-full mt-2 z-50 rounded-2xl"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-xl)',
            maxWidth: 'calc(100vw - 16px)',
          }}
        >
          <div className="flex flex-col sm:flex-row">

            {/* Presets — horizontal scroll on mobile, vertical column on desktop */}
            <div
              className="sm:w-52 sm:border-r border-b sm:border-b-0 flex-shrink-0"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {/* Presets list */}
              <div className="flex flex-row sm:flex-col gap-1 sm:gap-0 p-3 pb-2 sm:pb-3 sm:space-y-0.5 overflow-x-auto sm:overflow-x-visible scrollbar-hide">
                {PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className="flex-shrink-0 sm:flex-shrink sm:w-full text-left px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all"
                    style={{
                      backgroundColor: isPresetActive(preset.id)
                        ? `color-mix(in srgb, ${accent} 18%, transparent)`
                        : 'transparent',
                      color: isPresetActive(preset.id) ? accent : 'var(--text-primary)',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Last N days — both mobile and desktop */}
              <div className="px-3 pb-3 pt-0 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <p className="text-xs font-semibold mb-2 mt-3 px-1" style={{ color: 'var(--text-secondary)' }}>Últimos</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={lastNDays}
                    onChange={(e) => setLastNDays(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyLastN()}
                    placeholder="N"
                    className="w-16 px-2 py-1.5 rounded-lg text-sm text-center"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>días</span>
                  <button
                    onClick={applyLastN}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: accent, color: 'white' }}
                  >
                    Ir
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar — full-width on mobile, auto on desktop */}
            <div className="p-3 w-full sm:w-auto">
              <DayPicker
                mode="range"
                selected={tempRange.from && tempRange.to ? { from: tempRange.from, to: tempRange.to } : undefined}
                onSelect={(range) => {
                  if (range) setTempRange({ from: range.from || null, to: range.to || null });
                  else setTempRange({ from: null, to: null });
                }}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                locale={es}
                weekStartsOn={1}
                showOutsideDays
                classNames={{
                  months: 'flex flex-col w-full sm:w-auto',
                  month: 'relative w-full sm:w-auto space-y-2 sm:space-y-3',
                  month_caption: 'flex justify-center items-center h-8 sm:h-10 mb-1 sm:mb-2',
                  caption_label: 'text-xs sm:text-sm font-bold',
                  nav: 'absolute top-0 left-0 right-0 h-8 sm:h-10 flex items-center justify-between pointer-events-none',
                  button_previous: 'pointer-events-auto h-8 w-8 sm:h-10 sm:w-10 bg-transparent p-0 inline-flex items-center justify-center rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors',
                  button_next: 'pointer-events-auto h-8 w-8 sm:h-10 sm:w-10 bg-transparent p-0 inline-flex items-center justify-center rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors',
                  month_grid: 'w-full sm:w-auto border-collapse',
                  weekdays: 'flex w-full sm:w-auto',
                  weekday: 'flex-1 sm:flex-none sm:w-10 h-9 sm:h-10 font-semibold text-[9px] sm:text-[10px] uppercase tracking-wider flex items-center justify-center',
                  week: 'flex w-full sm:w-auto',
                  day: 'flex-1 sm:flex-none sm:w-10 h-9 sm:h-10 text-center text-xs sm:text-sm p-0',
                  day_button: 'w-full h-full rounded-lg sm:rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 font-medium',
                  selected: 'bg-[var(--accent-primary)] text-white',
                  range_start: 'rounded-lg sm:rounded-xl bg-[var(--accent-primary)] text-white',
                  range_end: 'rounded-lg sm:rounded-xl bg-[var(--accent-primary)] text-white',
                  range_middle: 'bg-[var(--accent-primary-dim)] rounded-none',
                  today: 'font-bold ring-2 ring-[var(--accent-primary)] ring-opacity-50',
                  outside: 'opacity-30',
                  disabled: 'opacity-20 cursor-not-allowed',
                }}
                styles={{
                  caption_label: { color: 'var(--text-primary)' },
                  weekday: { color: 'var(--text-secondary)' },
                  day_button: { color: 'var(--text-primary)' },
                  button_previous: { color: 'var(--text-primary)' },
                  button_next: { color: 'var(--text-primary)' },
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              onClick={cancel}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
            <button
              onClick={apply}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: accent }}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
