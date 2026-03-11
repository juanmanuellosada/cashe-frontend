import { memo } from 'react';

const COL_ICONS = {
  fecha: (
    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  nota: (
    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
    </svg>
  ),
  categoria: (
    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  cuenta: (
    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  monto: (
    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  equivalente: (
    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  desde: (
    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  hacia: (
    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  saliente: (
    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ),
  entrante: (
    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ),
};

function SortIcon({ direction }) {
  if (!direction) {
    return (
      <svg className="w-3 h-3 flex-shrink-0 opacity-0 group-hover/col:opacity-40 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  }
  if (direction === 'asc') {
    return (
      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  }
  return (
    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

const MovementsTableHeader = memo(function MovementsTableHeader({
  columns,
  sortConfig,
  onSortChange,
  onResizeStart,
  allSelected,
  someSelected,
  onSelectAll,
  selectionMode,
  gridTemplateColumns,
}) {
  const handleColumnClick = (col) => {
    if (!col.sortable) return;
    const isCurrent = sortConfig.sortBy === col.sortId;
    onSortChange({
      sortBy: col.sortId,
      sortOrder: isCurrent
        ? (sortConfig.sortOrder === 'asc' ? 'desc' : 'asc')
        : (col.defaultSortOrder ?? 'desc'),
    });
  };

  return (
    <div
      className="sticky z-10 grid border-b"
      style={{
        gridTemplateColumns,
        backgroundColor: 'var(--bg-tertiary)',
        borderColor: 'var(--border-subtle)',
        top: 0,
      }}
    >
      {/* Checkbox column - always first */}
      <div className="flex items-center justify-center px-2 py-2.5">
        {selectionMode ? (
          <button
            onClick={onSelectAll}
            className="w-4 h-4 rounded flex items-center justify-center transition-all flex-shrink-0"
            style={{
              backgroundColor: allSelected ? 'var(--accent-primary)' : 'transparent',
              border: allSelected || someSelected ? `1.5px solid var(--accent-primary)` : '1.5px solid var(--border-medium)',
            }}
            title={allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
          >
            {allSelected && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {!allSelected && someSelected && (
              <div className="w-2 h-px" style={{ backgroundColor: 'var(--accent-primary)' }} />
            )}
          </button>
        ) : (
          <div className="w-4 h-4" />
        )}
      </div>

      {columns.map((col) => {
        const isActive = sortConfig.sortBy === col.sortId;
        return (
          <div
            key={col.id}
            className="group/col relative flex items-center px-3 py-2.5 select-none overflow-hidden"
            style={{ justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}
          >
            <button
              onClick={() => handleColumnClick(col)}
              disabled={!col.sortable}
              className={`flex items-center gap-1 min-w-0 text-xs font-semibold transition-colors ${col.sortable ? 'cursor-pointer' : 'cursor-default'}`}
              style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
            >
              {COL_ICONS[col.id] && <span className="flex-shrink-0 opacity-60">{COL_ICONS[col.id]}</span>}
              <span className="truncate">{col.label}</span>
              {col.sortable && <span className="flex-shrink-0"><SortIcon direction={isActive ? sortConfig.sortOrder : null} /></span>}
            </button>

            {col.resizable && (
              <div
                className="absolute right-0 top-1 bottom-1 w-3 cursor-col-resize flex items-center justify-center z-10"
                onPointerDown={(e) => onResizeStart(col.id, e)}
              >
                <div
                  className="w-px h-full opacity-0 group-hover/col:opacity-30 hover:!opacity-100 transition-opacity"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                />
              </div>
            )}
          </div>
        );
      })}

      <div />
    </div>
  );
});

export default MovementsTableHeader;
