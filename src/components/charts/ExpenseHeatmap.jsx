import { useState, useMemo, Fragment } from 'react';
import { format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../../utils/format';
import { isEmoji, resolveIconPath } from '../../services/iconStorage';

const DAY_LABELS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

const stripEmoji = (name) => name.replace(/^[\p{Emoji}\p{Emoji_Presentation}\u200d\uFE0F]+\s*/u, '').trim() || name;

function ExpenseHeatmap({ movements, dateRange, currency = 'ARS', categoryIconMap = {} }) {
  const [hoveredDay, setHoveredDay] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const { gastosPorDia, percentiles, weeks, monthLabels } = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to || !movements?.length) {
      return { gastosPorDia: {}, percentiles: [0, 0, 0], weeks: [], monthLabels: [] };
    }

    const porDia = {};
    const gastos = movements.filter(m => m.tipo === 'gasto');

    gastos.forEach(m => {
      const dia = m.fecha;
      const monto = currency === 'ARS' ? (m.montoPesos || m.monto || 0) : (m.montoDolares || 0);
      if (!porDia[dia]) porDia[dia] = { total: 0, count: 0, movimientos: [] };
      porDia[dia].total += monto;
      porDia[dia].count += 1;
      porDia[dia].movimientos.push(m);
    });

    const valores = Object.values(porDia).map(d => d.total).filter(v => v > 0);
    valores.sort((a, b) => a - b);

    const getPercentile = (arr, p) => {
      if (arr.length === 0) return 0;
      const idx = Math.ceil(arr.length * p) - 1;
      return arr[Math.max(0, idx)];
    };

    const p25 = getPercentile(valores, 0.25);
    const p50 = getPercentile(valores, 0.50);
    const p75 = getPercentile(valores, 0.75);

    const gridStart = startOfWeek(dateRange.from, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(dateRange.to, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

    const weeksArr = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeksArr.push(allDays.slice(i, i + 7));
    }

    const labels = [];
    let lastMonth = -1;
    weeksArr.forEach((week, weekIdx) => {
      const firstDayOfWeek = week[0];
      const monthNum = firstDayOfWeek.getMonth();
      if (monthNum !== lastMonth) {
        labels.push({
          label: format(firstDayOfWeek, 'MMM', { locale: es }),
          col: weekIdx,
        });
        lastMonth = monthNum;
      }
    });

    return {
      gastosPorDia: porDia,
      percentiles: [p25, p50, p75],
      weeks: weeksArr,
      monthLabels: labels,
    };
  }, [movements, dateRange, currency]);

  const getCellColor = (dateStr) => {
    const data = gastosPorDia[dateStr];
    if (!data || data.total === 0) return 'var(--bg-tertiary)';

    const total = data.total;
    if (total <= percentiles[0]) return 'rgba(244, 63, 94, 0.25)';
    if (total <= percentiles[1]) return 'rgba(244, 63, 94, 0.5)';
    if (total <= percentiles[2]) return 'rgba(244, 63, 94, 0.75)';
    return 'rgba(244, 63, 94, 1)';
  };

  const handleMouseEnter = (dateStr, event) => {
    setHoveredDay(dateStr);
    const rect = event.currentTarget.getBoundingClientRect();
    const parentRect = event.currentTarget.closest('.heatmap-container')?.getBoundingClientRect();
    if (parentRect) {
      setTooltipPos({
        x: rect.left - parentRect.left + rect.width / 2,
        y: rect.top - parentRect.top - 8,
      });
    }
  };

  const handleDayClick = (dateStr) => {
    setSelectedDay(selectedDay === dateStr ? null : dateStr);
  };

  const selectedDayData = selectedDay ? gastosPorDia[selectedDay] : null;

  if (!dateRange?.from || !dateRange?.to) {
    return null;
  }

  const numWeeks = weeks.length || 1;
  const gridColumns = `20px repeat(${numWeeks}, 1fr)`;

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
    >
      <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
        Mapa de gastos diarios
      </h3>

      <div className="heatmap-container relative">
        {/* Month labels row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: gridColumns,
            gap: '0 2px',
            marginBottom: '4px',
          }}
        >
          <div /> {/* spacer for day-label column */}
          {weeks.map((week, weekIdx) => {
            const monthLabel = monthLabels.find(m => m.col === weekIdx);
            return (
              <div
                key={weekIdx}
                className="text-[10px] font-medium truncate"
                style={{ color: 'var(--text-secondary)' }}
              >
                {monthLabel
                  ? monthLabel.label.charAt(0).toUpperCase() + monthLabel.label.slice(1)
                  : ''}
              </div>
            );
          })}
        </div>

        {/* Data grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: gridColumns,
            gap: '2px',
          }}
        >
          {DAY_LABELS.map((dayLabel, dayIdx) => (
            <Fragment key={dayLabel}>
              {/* Day label */}
              <div
                className="flex items-center justify-end pr-0.5"
                style={{
                  fontSize: '9px',
                  color: 'var(--text-secondary)',
                  visibility: dayIdx % 2 === 0 ? 'visible' : 'hidden',
                }}
              >
                {dayLabel}
              </div>

              {/* Cells for this day across all weeks */}
              {weeks.map((week, weekIdx) => {
                const day = week[dayIdx];
                const dateStr = format(day, 'yyyy-MM-dd');
                const isInRange = day >= dateRange.from && day <= dateRange.to;
                const isHovered = hoveredDay === dateStr;
                const isSelected = selectedDay === dateStr;

                return (
                  <div
                    key={dateStr}
                    className="cursor-pointer transition-all duration-150"
                    style={{
                      aspectRatio: '1',
                      borderRadius: '20%',
                      backgroundColor: isInRange ? getCellColor(dateStr) : 'transparent',
                      opacity: isInRange ? 1 : 0.15,
                      outline: isSelected
                        ? '2px solid var(--accent-primary)'
                        : isHovered
                          ? '1px solid var(--text-muted)'
                          : 'none',
                      outlineOffset: '1px',
                    }}
                    onMouseEnter={(e) => handleMouseEnter(dateStr, e)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onClick={() => handleDayClick(dateStr)}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>

        {/* Tooltip */}
        {hoveredDay && gastosPorDia[hoveredDay] && (
          <div
            className="absolute z-10 px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <p className="text-xs font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
              {format(new Date(hoveredDay + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
            </p>
            <p className="text-xs" style={{ color: 'var(--accent-red)' }}>
              {formatCurrency(gastosPorDia[hoveredDay].total, currency)}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              {gastosPorDia[hoveredDay].count} transaccion{gastosPorDia[hoveredDay].count !== 1 ? 'es' : ''}
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Menos</span>
          <div className="rounded-[3px]" style={{ width: '12px', height: '12px', backgroundColor: 'var(--bg-tertiary)' }} />
          <div className="rounded-[3px]" style={{ width: '12px', height: '12px', backgroundColor: 'rgba(244, 63, 94, 0.25)' }} />
          <div className="rounded-[3px]" style={{ width: '12px', height: '12px', backgroundColor: 'rgba(244, 63, 94, 0.5)' }} />
          <div className="rounded-[3px]" style={{ width: '12px', height: '12px', backgroundColor: 'rgba(244, 63, 94, 0.75)' }} />
          <div className="rounded-[3px]" style={{ width: '12px', height: '12px', backgroundColor: 'rgba(244, 63, 94, 1)' }} />
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Mas</span>
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && selectedDayData && (
        <div
          className="mt-4 pt-4 space-y-2"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
              {format(new Date(selectedDay + 'T12:00:00'), "EEEE d 'de' MMMM yyyy", { locale: es })}
            </p>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-1 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
            >
              <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-1">
            {selectedDayData.movimientos.map((m, i) => {
              const catName = m.categoria || 'Sin categoria';
              const cleanName = stripEmoji(catName);
              const icon = categoryIconMap[cleanName] || categoryIconMap[catName];
              return (
              <div
                key={m.id || i}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {icon && (
                    isEmoji(icon)
                      ? <span className="text-sm flex-shrink-0">{icon}</span>
                      : <img src={resolveIconPath(icon)} alt="" className="w-4 h-4 rounded-sm flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {cleanName}
                  </p>
                  {m.nota && (
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
                      {m.nota}
                    </p>
                  )}
                  </div>
                </div>
                <span className="text-xs font-medium ml-2" style={{ color: 'var(--accent-red)' }}>
                  {formatCurrency(currency === 'ARS' ? (m.montoPesos || m.monto || 0) : (m.montoDolares || 0), currency)}
                </span>
              </div>
            );
            })}
          </div>
          <p className="text-[10px] text-right" style={{ color: 'var(--text-secondary)' }}>
            Total: {formatCurrency(selectedDayData.total, currency)} ({selectedDayData.count} transacciones)
          </p>
        </div>
      )}
    </div>
  );
}

export default ExpenseHeatmap;
