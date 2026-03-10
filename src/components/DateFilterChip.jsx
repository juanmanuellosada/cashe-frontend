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
  { id: 'thisMonth', label: 'Este mes' },
  { id: 'lastMonth', label: 'El mes pasado' },
  { id: 'thisQuarter', label: 'Este trimestre' },
  { id: 'lastQuarter', label: 'El trimestre pasado' },
  { id: 'ytd', label: 'Lo que va del año' },
  { id: 'lastYear', label: 'El año pasado' },
  { id: 'all', label: 'Todo el historial' },
];

function getPresetRange(id) {
  const now = new Date();
  switch (id) {
    case 'thisMonth': return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'lastMonth': { const m = subMonths(now, 1); return { from: startOfMonth(m), to: endOfMonth(m) }; }
    case 'thisQuarter': return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case 'lastQuarter': { const q = subQuarters(now, 1); return { from: startOfQuarter(q), to: endOfQuarter(q) }; }
    case 'ytd': return { from: startOfYear(now), to: now };
    case 'lastYear': { const y = subYears(now, 1); return { from: startOfYear(y), to: new Date(y.getFullYear(), 11, 31) }; }
    case 'all': return { from: null, to: null };
    default: return { from: null, to: null };
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
  const panelRef = useRef(null);

  // sync tempRange when value changes externally
  useEffect(() => { setTempRange(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const apply = () => {
    onChange(tempRange);
    setOpen(false);
  };

  const cancel = () => {
    setTempRange(value);
    setOpen(false);
  };

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

  return (
    <div className="relative" ref={panelRef}>
      {/* Chip */}
      <button
        onClick={() => { setTempRange(value); setOpen(!open); }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{
          backgroundColor: hasFilter ? (accentColor ? `${accentColor}22` : 'var(--accent-primary-dim)') : 'var(--bg-tertiary)',
          color: hasFilter ? (accentColor || 'var(--accent-primary)') : 'var(--text-secondary)',
          border: `1px solid ${hasFilter ? (accentColor || 'var(--accent-primary)') : 'var(--border-subtle)'}`,
        }}
      >
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="font-medium italic" style={{ color: hasFilter ? (accentColor || 'var(--accent-primary)') : 'var(--text-secondary)' }}>
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
          className="absolute left-0 top-full mt-2 z-50 rounded-2xl shadow-xl"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            minWidth: '580px',
          }}
        >
          <div className="flex">
            {/* Left: presets */}
            <div className="w-52 border-r p-3 space-y-0.5 flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
              {PRESETS.map(preset => {
                const range = getPresetRange(preset.id);
                const isActive =
                  (tempRange.from?.toDateString() === range.from?.toDateString() || (!tempRange.from && !range.from)) &&
                  (tempRange.to?.toDateString() === range.to?.toDateString() || (!tempRange.to && !range.to));
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
                    style={{
                      backgroundColor: isActive ? (accentColor ? `${accentColor}22` : 'rgba(20,184,166,0.15)') : 'transparent',
                      color: isActive ? (accentColor || 'var(--accent-primary)') : 'var(--text-primary)',
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}

              {/* Last N days */}
              <div className="pt-3 mt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <p className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--text-secondary)' }}>Últimos</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={lastNDays}
                    onChange={(e) => setLastNDays(e.target.value)}
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
                    style={{ backgroundColor: accentColor || 'var(--accent-primary)', color: 'white' }}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>

            {/* Right: calendar */}
            <div className="p-3">
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
                className="rdp-cashe"
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
              style={{ backgroundColor: accentColor || 'var(--accent-primary)' }}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
