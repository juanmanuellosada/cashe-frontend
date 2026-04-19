import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseLocalDate } from '../utils/format';
import 'react-day-picker/style.css';

function DatePicker({ value, onChange, name, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, placeAbove: false });
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

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

  // Track trigger position so the portaled menu follows it on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const menuHeight = 360;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < menuHeight && rect.top > menuHeight;
      setMenuPos({
        top: placeAbove ? rect.top - 8 : rect.bottom + 8,
        left: rect.left,
        placeAbove,
      });
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Cerrar al hacer click fuera (incluye el menú portaleado)
  useEffect(() => {
    const handleClickOutside = (event) => {
      const insideTrigger = containerRef.current?.contains(event.target);
      const insideMenu = menuRef.current?.contains(event.target);
      if (!insideTrigger && !insideMenu) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Seleccionar fecha${displayDate ? `: ${displayDate}` : ''}`}
        aria-expanded={isOpen}
        className={`w-full text-left flex items-center min-h-[44px] ${compact ? 'px-2.5 py-2 rounded-lg gap-1.5 text-xs' : 'px-4 py-3 rounded-xl gap-3 text-sm'}`}
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

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[200] rounded-xl shadow-xl p-3 sm:p-4 max-w-[calc(100vw-32px)] sm:max-w-none"
          style={{
            top: menuPos.top,
            left: menuPos.left,
            transform: menuPos.placeAbove ? 'translateY(-100%)' : undefined,
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
              month: 'relative space-y-2 sm:space-y-3',
              month_caption: 'flex justify-center relative items-center h-8 sm:h-10 mb-1 sm:mb-2',
              caption_label: 'text-xs sm:text-sm font-semibold',
              // Overlay the nav on the caption row so prev/next align vertically with the month label
              nav: 'absolute top-0 left-0 right-0 h-8 sm:h-10 flex items-center pointer-events-none',
              button_previous: 'pointer-events-auto absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 bg-transparent p-0 hover:opacity-70 inline-flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)]',
              button_next: 'pointer-events-auto absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 bg-transparent p-0 hover:opacity-70 inline-flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)]',
              month_grid: 'w-full border-collapse',
              weekdays: 'flex w-full',
              weekday: 'w-9 h-9 sm:w-10 sm:h-10 font-medium text-[10px] sm:text-xs flex items-center justify-center',
              week: 'flex w-full',
              day: 'w-9 h-9 sm:w-10 sm:h-10 text-center text-xs sm:text-sm p-0',
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
        </div>,
        document.body
      )}
    </div>
  );
}

export default DatePicker;
