import { useMemo } from 'react';
import { useColumnResize } from './useColumnResize';
import MovementsTableHeader from './MovementsTableHeader';
import MovementsTableRow from './MovementsTableRow';

function getColumns(type) {
  if (type === 'transferencia') {
    return [
      { id: 'desde', label: 'Desde', resizable: true, defaultWidth: 170, minWidth: 100, maxWidth: 400, sortable: true, sortId: 'accountFrom' },
      { id: 'hacia', label: 'Hacia', resizable: true, defaultWidth: 170, minWidth: 100, maxWidth: 400, sortable: true, sortId: 'accountTo' },
      { id: 'fecha', label: 'Fecha', resizable: false, defaultWidth: 90, sortable: true, sortId: 'date' },
      { id: 'saliente', label: 'Saliente', resizable: false, defaultWidth: 130, sortable: true, sortId: 'amount', align: 'right' },
      { id: 'entrante', label: 'Entrante', resizable: false, defaultWidth: 130, sortable: false, align: 'right' },
      { id: 'nota', label: 'Nota', resizable: true, defaultWidth: 160, minWidth: 80, maxWidth: 400, sortable: false },
    ];
  }
  return [
    { id: 'fecha', label: 'Fecha', resizable: false, defaultWidth: 90, sortable: true, sortId: 'date' },
    { id: 'nota', label: 'Descripción', resizable: true, defaultWidth: 200, minWidth: 120, maxWidth: 500, sortable: false },
    { id: 'categoria', label: 'Categoría', resizable: true, defaultWidth: 150, minWidth: 100, maxWidth: 300, sortable: true, sortId: 'category' },
    { id: 'cuenta', label: 'Cuenta', resizable: true, defaultWidth: 140, minWidth: 80, maxWidth: 300, sortable: true, sortId: 'account' },
    { id: 'monto', label: 'Monto', resizable: false, defaultWidth: 120, sortable: true, sortId: 'amount', align: 'right' },
    { id: 'equivalente', label: 'Equiv.', resizable: false, defaultWidth: 110, sortable: false, align: 'right' },
  ];
}

export default function MovementsTable({
  movements,
  type,
  accounts,
  sortConfig,
  onSortChange,
  selectionMode,
  selectedItems,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onMovementClick,
  onDeleteClick,
  getTypeColor,
  getTypeBgDim,
  isAccountUSD,
  storageKey,
}) {
  const columns = useMemo(() => getColumns(type), [type]);
  const { columnWidths, onResizeStart } = useColumnResize(columns, storageKey);

  const gridTemplateColumns = useMemo(() => {
    const parts = ['40px']; // checkbox always first
    columns.forEach((col) => {
      const w = col.resizable ? (columnWidths[col.id] ?? col.defaultWidth) : col.defaultWidth;
      parts.push(`${w}px`);
    });
    parts.push('36px'); // actions
    return parts.join(' ');
  }, [columns, columnWidths]);

  const allSelected = movements.length > 0 && movements.every((m) => selectedItems.has(m.rowIndex || m.id));
  const someSelected = !allSelected && movements.some((m) => selectedItems.has(m.rowIndex || m.id));

  const handleSelectAll = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  return (
    <div
      className="rounded-xl"
      style={{
        border: '1px solid var(--border-subtle)',
        overflowX: 'auto',
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 260px)',
      }}
    >
      <div style={{ minWidth: 'max-content', width: '100%' }}>
        <MovementsTableHeader
          columns={columns}
          sortConfig={sortConfig}
          onSortChange={onSortChange}
          onResizeStart={onResizeStart}
          allSelected={allSelected}
          someSelected={someSelected}
          onSelectAll={handleSelectAll}
          selectionMode={selectionMode}
          gridTemplateColumns={gridTemplateColumns}
        />
        {movements.map((movement) => (
          <MovementsTableRow
            key={movement.rowIndex || movement.id}
            movement={movement}
            type={type}
            accounts={accounts}
            isSelected={selectedItems.has(movement.rowIndex || movement.id)}
            selectionMode={selectionMode}
            onToggleSelect={onToggleSelect}
            onClick={onMovementClick}
            onDeleteClick={onDeleteClick}
            getTypeColor={getTypeColor}
            getTypeBgDim={getTypeBgDim}
            isAccountUSD={isAccountUSD}
            gridTemplateColumns={gridTemplateColumns}
          />
        ))}
      </div>
    </div>
  );
}
