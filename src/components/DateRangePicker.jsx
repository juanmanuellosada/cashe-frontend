import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-day-picker/style.css';

const PRESETS = [
  { label: 'Esta semana', getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: 'Este mes', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Mes anterior', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Ultimos 3 meses', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) }) },
];

// Helper to ensure date is a Date object
const ensureDate = (date) => {
  if (!date) return null;
  if (date instanceof Date) return date;
  return new Date(date);
};

function DateRangePicker({ value, onChange, presets = PRESETS, defaultPreset = 'Este mes' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize value to ensure Date objects
  const normalizeRange = (r) => {
    if (!r) return PRESETS.find(p => p.label === defaultPreset)?.getValue() || { from: startOfMonth(new Date()), to: endOfMonth(new Date()) };
    return {
      from: ensureDate(r.from),
      to: ensureDate(r.to)
    };
  };

  const [range, setRange] = useState(() => normalizeRange(value));

  useEffect(() => {
    if (value) {
      setRange(normalizeRange(value));
    }
  }, [value]);

  const handleSelect = (newRange) => {
    if (newRange?.from) {
      setRange(newRange);
      if (newRange.to) {
        onChange?.(newRange);
      }
    }
  };

  const handlePresetClick = (preset) => {
    const newRange = preset.getValue();
    setRange(newRange);
    onChange?.(newRange);
    setIsOpen(false);
  };

  const formatDisplayDate = () => {
    if (!range?.from) return 'Fechas';
    // Ensure dates are Date objects
    const fromDate = range.from instanceof Date ? range.from : new Date(range.from);
    const toDate = range.to ? (range.to instanceof Date ? range.to : new Date(range.to)) : null;

    if (!toDate) return format(fromDate, 'd/M');
    // Formato ultra compacto: solo días si es mismo mes
    const sameMonth = fromDate.getMonth() === toDate.getMonth();
    if (sameMonth) {
      return `${format(fromDate, 'd')}-${format(toDate, 'd')}/${format(toDate, 'M')}`;
    }
    return `${format(fromDate, 'd/M')}-${format(toDate, 'd/M')}`;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-sm flex items-center gap-1.5 transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-[0.98]"
        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
      >
        <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="font-medium text-xs">{formatDisplayDate()}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-secondary)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 mt-2 rounded-xl min-[400px]:rounded-2xl shadow-2xl p-3 sm:p-4 right-0 sm:right-0 left-auto animate-scale-in max-w-[calc(100vw-32px)] sm:max-w-none"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            minWidth: 'min(290px, calc(100vw - 32px))',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(139, 124, 255, 0.1)'
          }}
        >
          {/* Presets */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset)}
                className="px-2.5 sm:px-3 py-1.5 sm:py-1.5 rounded-md min-[400px]:rounded-lg text-xs font-semibold transition-all duration-200 hover:bg-[var(--accent-primary-dim)] hover:text-[var(--accent-primary)] active:scale-95"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <DayPicker
            mode="range"
            selected={range}
            onSelect={handleSelect}
            locale={es}
            weekStartsOn={1}
            showOutsideDays
            numberOfMonths={1}
            formatters={{
              formatWeekdayName: (date) => {
                const days = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
                return days[date.getDay()];
              },
            }}
            classNames={{
              months: 'flex flex-col',
              month: 'space-y-2 sm:space-y-3',
              month_caption: 'flex justify-center relative items-center h-8 sm:h-10 mb-1 sm:mb-2',
              caption_label: 'text-xs sm:text-sm font-bold font-display',
              nav: 'flex items-center',
              button_previous: 'absolute left-0 h-7 w-7 sm:h-8 sm:w-8 bg-transparent p-0 inline-flex items-center justify-center rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors',
              button_next: 'absolute right-0 h-7 w-7 sm:h-8 sm:w-8 bg-transparent p-0 inline-flex items-center justify-center rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors',
              month_grid: 'w-full border-collapse',
              weekdays: 'flex w-full',
              weekday: 'w-8 h-8 sm:w-9 sm:h-9 font-semibold text-[9px] sm:text-[10px] uppercase tracking-wider flex items-center justify-center',
              week: 'flex w-full',
              day: 'w-8 h-8 sm:w-9 sm:h-9 text-center text-xs sm:text-sm p-0',
              day_button: 'w-full h-full rounded-lg sm:rounded-xl hover:bg-[var(--accent-primary)] hover:bg-opacity-20 flex items-center justify-center cursor-pointer transition-all duration-200 font-medium',
              selected: 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]',
              range_start: 'rounded-lg sm:rounded-xl bg-[var(--accent-primary)] text-white',
              range_end: 'rounded-lg sm:rounded-xl bg-[var(--accent-primary)] text-white',
              range_middle: 'bg-[var(--accent-primary)] bg-opacity-15 rounded-none',
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

          <div className="flex justify-end mt-3 sm:mt-4 pt-2 sm:pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg min-[400px]:rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-purple) 100%)',
                color: 'white',
                boxShadow: '0 4px 16px var(--accent-primary-glow)'
              }}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;
