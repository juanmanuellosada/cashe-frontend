import { memo } from 'react';

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
        backgroundColor: 'var(--bg-secondary)',
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
              border: allSelected || someSelected ? `1.5px solid var(--accent-primary)` : '1.5px solid var(--border)',
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
