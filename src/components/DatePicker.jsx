import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseLocalDate } from '../utils/format';
import 'react-day-picker/style.css';

function DatePicker({ value, onChange, name, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Convertir string yyyy-mm-dd a Date usando parseLocalDate para evitar timezone issues
  const selectedDate = value ? parseLocalDate(value) : new Date();

  // Formatear fecha para mostrar
  const displayDate = selectedDate
    ? (compact ? format(selectedDate, 'dd/MM/yy') : format(selectedDate, 'dd-MM-yyyy'))
    : '';

  const handleSelect = (date) => {
    if (date) {
      // Convertir Date a string yyyy-MM-dd para el formulario
      const formattedValue = format(date, 'yyyy-MM-dd');
      onChange({ target: { name, value: formattedValue } });
    }
    setIsOpen(false);
  };

  // Cerrar al hacer click fuera
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
        className={`w-full text-left flex items-center ${compact ? 'px-2.5 py-2 rounded-lg gap-1.5 text-xs' : 'px-4 py-3 rounded-xl gap-3 text-sm'}`}
        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
      >
        <svg
          className={compact ? 'w-3.5 h-3.5' : 'w-5 h-5'}
          style={{ color: 'var(--text-secondary)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>{displayDate}</span>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 mt-2 rounded-xl shadow-xl p-3 sm:p-4 left-0 sm:left-0 max-w-[calc(100vw-32px)] sm:max-w-none"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--bg-tertiary)',
            minWidth: 'min(280px, calc(100vw - 32px))',
          }}
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            locale={es}
            weekStartsOn={1}
            showOutsideDays
            fixedWeeks
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
              caption_label: 'text-xs sm:text-sm font-semibold',
              nav: 'flex items-center',
              button_previous: 'absolute left-0 h-7 w-7 sm:h-8 sm:w-8 bg-transparent p-0 hover:opacity-70 inline-flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)]',
              button_next: 'absolute right-0 h-7 w-7 sm:h-8 sm:w-8 bg-transparent p-0 hover:opacity-70 inline-flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)]',
              month_grid: 'w-full border-collapse',
              weekdays: 'flex w-full',
              weekday: 'w-8 h-8 sm:w-9 sm:h-9 font-medium text-[10px] sm:text-xs flex items-center justify-center',
              week: 'flex w-full',
              day: 'w-8 h-8 sm:w-9 sm:h-9 text-center text-xs sm:text-sm p-0',
              day_button: 'w-full h-full rounded-full hover:bg-[var(--accent-primary)] hover:bg-opacity-20 flex items-center justify-center cursor-pointer transition-colors',
              selected: 'rounded-full bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]',
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
        </div>
      )}
    </div>
  );
}

export default DatePicker;
