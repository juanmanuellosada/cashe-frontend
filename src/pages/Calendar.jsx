import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, isSameMonth, isSameWeek, isSameDay, isToday, addDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getCalendarEvents } from '../services/supabaseApi';
import { useError } from '../contexts/ErrorContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/format';

function Calendar() {
  const { showError } = useError();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, expense, income, transfer
  const [viewMode, setViewMode] = useState('month'); // month, week

  // Fetch events for the current period
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        let start, end;

        if (viewMode === 'month') {
          const monthStart = startOfMonth(currentDate);
          const monthEnd = endOfMonth(currentDate);
          start = startOfWeek(monthStart, { weekStartsOn: 1 });
          end = endOfWeek(monthEnd, { weekStartsOn: 1 });
        } else {
          start = startOfWeek(currentDate, { weekStartsOn: 1 });
          end = endOfWeek(currentDate, { weekStartsOn: 1 });
        }

        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');

        const data = await getCalendarEvents(startStr, endStr);
        setEvents(data || []);
      } catch (err) {
        console.error('Error fetching calendar events:', err);
        showError('Error', 'No se pudieron cargar los eventos del calendario');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [currentDate, viewMode]);

  // Filter events based on selected filter
  const filteredEvents = useMemo(() => {
    const eventsArray = Array.isArray(events) ? events : [];
    if (filter === 'all') return eventsArray;
    return eventsArray.filter(e => e.type === filter);
  }, [events, filter]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped = {};
    filteredEvents.forEach(event => {
      if (!grouped[event.date]) {
        grouped[event.date] = [];
      }
      grouped[event.date].push(event);
    });
    return grouped;
  }, [filteredEvents]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate[dateStr] || [];
  }, [selectedDate, eventsByDate]);

  // Calculate daily totals
  const getDayTotals = (dateStr) => {
    const dayEvents = eventsByDate[dateStr] || [];
    let income = 0;
    let expense = 0;

    dayEvents.forEach(e => {
      if (e.type === 'income') income += e.amount;
      else if (e.type === 'expense') expense += e.amount;
    });

    return { income, expense };
  };

  // Generate calendar days for month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = [];
    let day = start;

    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentDate]);

  // Generate week days for week view
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = [];

    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }

    return days;
  }, [currentDate]);

  // Navigation handlers
  const prev = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const next = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Get event type color
  const getEventColor = (type) => {
    switch (type) {
      case 'income': return 'var(--accent-green)';
      case 'expense': return 'var(--accent-red)';
      case 'transfer': return 'var(--accent-blue)';
      default: return 'var(--text-muted)';
    }
  };

  // Get event type background
  const getEventBg = (type, isScheduled = false) => {
    if (isScheduled) {
      // Lighter/more transparent for scheduled (pending) transactions
      switch (type) {
        case 'income': return 'color-mix(in srgb, var(--accent-green) 10%, transparent)';
        case 'expense': return 'color-mix(in srgb, var(--accent-red) 10%, transparent)';
        case 'transfer': return 'color-mix(in srgb, var(--accent-blue) 10%, transparent)';
        default: return 'var(--bg-tertiary)';
      }
    }
    switch (type) {
      case 'income': return 'var(--accent-green-dim)';
      case 'expense': return 'var(--accent-red-dim)';
      case 'transfer': return 'var(--accent-blue-dim)';
      default: return 'var(--bg-tertiary)';
    }
  };

  const filters = [
    { id: 'all', label: 'Todos' },
    { id: 'expense', label: 'Gastos', color: 'var(--accent-red)' },
    { id: 'income', label: 'Ingresos', color: 'var(--accent-green)' },
    { id: 'transfer', label: 'Transferencias', color: 'var(--accent-blue)' },
  ];

  const weekDayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Get period title
  const getPeriodTitle = () => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: es });
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      const startMonth = format(start, 'MMM', { locale: es });
      const endMonth = format(end, 'MMM', { locale: es });

      if (startMonth === endMonth) {
        return `${format(start, 'd')} - ${format(end, 'd')} ${format(end, 'MMMM yyyy', { locale: es })}`;
      } else {
        return `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM yyyy', { locale: es })}`;
      }
    }
  };

  // Calculate period summary
  const periodSummary = useMemo(() => {
    let periodEvents;

    if (viewMode === 'month') {
      periodEvents = filteredEvents.filter(e => isSameMonth(parseISO(e.date), currentDate));
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      periodEvents = filteredEvents.filter(e => isSameWeek(parseISO(e.date), start, { weekStartsOn: 1 }));
    }

    const income = periodEvents
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    const expense = periodEvents
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);

    return { income, expense, balance: income - expense };
  }, [filteredEvents, currentDate, viewMode]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Calendario
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Visualiza todos tus movimientos
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          {/* View mode toggle */}
          <div
            className="flex p-1 rounded-xl"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'month' ? 'shadow-sm' : ''
              }`}
              style={{
                backgroundColor: viewMode === 'month' ? 'var(--bg-primary)' : 'transparent',
                color: viewMode === 'month' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'week' ? 'shadow-sm' : ''
              }`}
              style={{
                backgroundColor: viewMode === 'week' ? 'var(--bg-primary)' : 'transparent',
                color: viewMode === 'week' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              Semana
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
          >
            Hoy
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl overflow-x-auto"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0
              ${filter === f.id ? 'shadow-sm' : 'hover:opacity-80'}
            `}
            style={{
              backgroundColor: filter === f.id ? 'var(--bg-primary)' : 'transparent',
              color: filter === f.id ? (f.color || 'var(--text-primary)') : 'var(--text-muted)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {/* Navigation */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <button
            onClick={prev}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
            {getPeriodTitle()}
          </h2>
          <button
            onClick={next}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px" style={{ backgroundColor: 'var(--border-subtle)' }}>
          {weekDayLabels.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-xs font-medium"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <LoadingSpinner />
          </div>
        ) : viewMode === 'month' ? (
          /* Month View */
          <div className="grid grid-cols-7 gap-px" style={{ backgroundColor: 'var(--border-subtle)' }}>
            {calendarDays.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate[dateStr] || [];
              const totals = getDayTotals(dateStr);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    relative min-h-[80px] p-1.5 text-left transition-all
                    ${!isCurrentMonth ? 'opacity-40' : ''}
                    ${isSelected ? 'ring-2 ring-inset' : ''}
                  `}
                  style={{
                    backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    ringColor: 'var(--accent-primary)',
                  }}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`
                        w-6 h-6 flex items-center justify-center text-xs font-medium rounded-full
                        ${isTodayDate ? 'text-white' : ''}
                      `}
                      style={{
                        backgroundColor: isTodayDate ? 'var(--accent-primary)' : 'transparent',
                        color: isTodayDate ? 'white' : 'var(--text-primary)',
                      }}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span
                        className="text-[10px] px-1 rounded"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                      >
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Event indicators */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate ${event.isScheduled ? 'border border-dashed' : ''}`}
                        style={{
                          backgroundColor: getEventBg(event.type, event.isScheduled),
                          color: getEventColor(event.type),
                          borderColor: event.isScheduled ? getEventColor(event.type) : 'transparent',
                          opacity: event.isScheduled ? 0.8 : 1,
                        }}
                      >
                        {event.isRecurring && (
                          <svg className="w-2 h-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                        {event.isFuture && (
                          <svg className="w-2 h-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {event.isScheduled && (
                          <svg className="w-2 h-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                        <span className="truncate">{event.name}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div
                        className="text-[10px] px-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        +{dayEvents.length - 3} más
                      </div>
                    )}
                  </div>

                  {/* Daily totals (mobile hidden) */}
                  {(totals.income > 0 || totals.expense > 0) && (
                    <div className="hidden sm:flex absolute bottom-1 right-1 gap-1 text-[9px]">
                      {totals.income > 0 && (
                        <span style={{ color: 'var(--accent-green)' }}>
                          +{formatCurrency(totals.income, 'Peso', true)}
                        </span>
                      )}
                      {totals.expense > 0 && (
                        <span style={{ color: 'var(--accent-red)' }}>
                          -{formatCurrency(totals.expense, 'Peso', true)}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Week View */
          <div className="grid grid-cols-7 gap-px" style={{ backgroundColor: 'var(--border-subtle)' }}>
            {weekDays.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate[dateStr] || [];
              const totals = getDayTotals(dateStr);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    relative min-h-[200px] p-2 text-left transition-all flex flex-col
                    ${isSelected ? 'ring-2 ring-inset' : ''}
                  `}
                  style={{
                    backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    ringColor: 'var(--accent-primary)',
                  }}
                >
                  {/* Day header */}
                  <div className="flex flex-col items-center mb-2 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span
                      className={`
                        w-8 h-8 flex items-center justify-center text-sm font-bold rounded-full mb-1
                        ${isTodayDate ? 'text-white' : ''}
                      `}
                      style={{
                        backgroundColor: isTodayDate ? 'var(--accent-primary)' : 'transparent',
                        color: isTodayDate ? 'white' : 'var(--text-primary)',
                      }}
                    >
                      {format(day, 'd')}
                    </span>
                    <span className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>
                      {format(day, 'EEE', { locale: es })}
                    </span>
                  </div>

                  {/* Events list */}
                  <div className="flex-1 space-y-1 overflow-y-auto">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`flex items-center gap-1 px-1.5 py-1 rounded text-[11px] ${event.isScheduled ? 'border border-dashed' : ''}`}
                        style={{
                          backgroundColor: getEventBg(event.type, event.isScheduled),
                          color: getEventColor(event.type),
                          borderColor: event.isScheduled ? getEventColor(event.type) : 'transparent',
                          opacity: event.isScheduled ? 0.8 : 1,
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            {event.isRecurring && (
                              <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                            {event.isFuture && (
                              <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            {event.isScheduled && (
                              <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                            <span className="truncate font-medium">{event.name}</span>
                          </div>
                          <div className="text-[10px] opacity-80">
                            {event.type === 'expense' ? '-' : event.type === 'income' ? '+' : ''}
                            {formatCurrency(event.amount, 'Peso', true)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {dayEvents.length === 0 && (
                      <div className="text-[10px] text-center py-2" style={{ color: 'var(--text-muted)' }}>
                        Sin eventos
                      </div>
                    )}
                  </div>

                  {/* Daily totals */}
                  {(totals.income > 0 || totals.expense > 0) && (
                    <div
                      className="mt-2 pt-2 border-t text-[10px] space-y-0.5"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      {totals.income > 0 && (
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--text-muted)' }}>Ingresos</span>
                          <span style={{ color: 'var(--accent-green)' }}>
                            +{formatCurrency(totals.income, 'Peso', true)}
                          </span>
                        </div>
                      )}
                      {totals.expense > 0 && (
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--text-muted)' }}>Gastos</span>
                          <span style={{ color: 'var(--accent-red)' }}>
                            -{formatCurrency(totals.expense, 'Peso', true)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected day events */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
            {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
          </h3>
          {selectedDateEvents.length > 0 && (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {selectedDateEvents.length} evento{selectedDateEvents.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {selectedDateEvents.length === 0 ? (
          <div className="text-center py-8">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: 'var(--text-muted)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No hay movimientos para este día
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDateEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 rounded-xl transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: getEventBg(event.type) }}
                  >
                    {event.type === 'income' && (
                      <svg className="w-5 h-5" style={{ color: getEventColor(event.type) }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                    {event.type === 'expense' && (
                      <svg className="w-5 h-5" style={{ color: getEventColor(event.type) }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    )}
                    {event.type === 'transfer' && (
                      <svg className="w-5 h-5" style={{ color: getEventColor(event.type) }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className="font-medium text-sm truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {event.name}
                      </p>
                      {event.isRecurring && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] flex-shrink-0"
                          style={{ backgroundColor: 'var(--accent-purple-dim)', color: 'var(--accent-purple)' }}
                        >
                          Recurrente
                        </span>
                      )}
                      {event.isFuture && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] flex-shrink-0"
                          style={{ backgroundColor: 'var(--accent-yellow-dim)', color: 'var(--accent-yellow)' }}
                        >
                          Futuro
                        </span>
                      )}
                      {event.eventType === 'recurring_scheduled' && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] flex-shrink-0"
                          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                        >
                          Próximo
                        </span>
                      )}
                      {event.isScheduled && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] flex-shrink-0 border border-dashed"
                          style={{ backgroundColor: 'var(--accent-orange-dim)', color: 'var(--accent-orange)', borderColor: 'var(--accent-orange)' }}
                        >
                          Por aprobar
                        </span>
                      )}
                    </div>
                    {event.account && (
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {event.account}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className="font-semibold text-sm whitespace-nowrap ml-3"
                  style={{ color: getEventColor(event.type) }}
                >
                  {event.type === 'expense' ? '-' : event.type === 'income' ? '+' : ''}
                  {formatCurrency(event.amount, 'Peso')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          Leyenda
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: 'var(--accent-green)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Ingreso
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: 'var(--accent-red)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Gasto
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: 'var(--accent-blue)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Transferencia
            </span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-3 h-3" style={{ color: 'var(--accent-purple)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Recurrente
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded border border-dashed"
              style={{ borderColor: 'var(--accent-orange)', backgroundColor: 'var(--accent-orange-dim)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Por aprobar
            </span>
          </div>
        </div>
      </div>

      {/* Period summary */}
      {!loading && (
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
            Resumen {viewMode === 'month' ? 'del mes' : 'de la semana'}
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                Ingresos
              </p>
              <p className="font-bold" style={{ color: 'var(--accent-green)' }}>
                {formatCurrency(periodSummary.income, 'Peso')}
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                Gastos
              </p>
              <p className="font-bold" style={{ color: 'var(--accent-red)' }}>
                {formatCurrency(periodSummary.expense, 'Peso')}
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                Balance
              </p>
              <p
                className="font-bold"
                style={{ color: periodSummary.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
              >
                {formatCurrency(periodSummary.balance, 'Peso')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;
