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

function DateRangePicker({ value, onChange, presets = PRESETS, defaultPreset = 'Este mes' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState(value || PRESETS.find(p => p.label === defaultPreset)?.getValue() || { from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  const containerRef = useRef(null);

  useEffect(() => {
    if (value) {
      setRange(value);
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
    if (!range?.from) return 'Seleccionar fechas';
    if (!range?.to) return format(range.from, 'dd-MM-yyyy');
    return `${format(range.from, 'dd-MM-yyyy')} - ${format(range.to, 'dd-MM-yyyy')}`;
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
        className="px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
      >
        <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{formatDisplayDate()}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 mt-2 rounded-xl shadow-xl p-4 right-0"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)', minWidth: '280px' }}
        >
          {/* Presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
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
              month: 'space-y-3',
              month_caption: 'flex justify-center relative items-center h-10 mb-2',
              caption_label: 'text-sm font-semibold',
              nav: 'flex items-center',
              button_previous: 'absolute left-0 h-7 w-7 bg-transparent p-0 hover:opacity-70 inline-flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)]',
              button_next: 'absolute right-0 h-7 w-7 bg-transparent p-0 hover:opacity-70 inline-flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)]',
              month_grid: 'w-full border-collapse',
              weekdays: 'flex w-full',
              weekday: 'w-9 h-9 font-medium text-xs flex items-center justify-center',
              week: 'flex w-full',
              day: 'w-9 h-9 text-center text-sm p-0',
              day_button: 'w-full h-full rounded-full hover:bg-[var(--accent-primary)] hover:bg-opacity-20 flex items-center justify-center cursor-pointer transition-colors',
              selected: 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]',
              range_start: 'rounded-full bg-[var(--accent-primary)] text-white',
              range_end: 'rounded-full bg-[var(--accent-primary)] text-white',
              range_middle: 'bg-[var(--accent-primary)] bg-opacity-20 rounded-none',
              today: 'font-bold',
              outside: 'opacity-40',
              disabled: 'opacity-30 cursor-not-allowed',
            }}
            styles={{
              caption_label: { color: 'var(--text-primary)' },
              weekday: { color: 'var(--text-secondary)' },
              day_button: { color: 'var(--text-primary)' },
              button_previous: { color: 'var(--text-primary)' },
              button_next: { color: 'var(--text-primary)' },
            }}
          />

          <div className="flex justify-end mt-3">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
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
