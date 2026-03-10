import { useMemo } from 'react';
import { useColumnResize } from './useColumnResize';
import NotionTableHeader from './NotionTableHeader';
import NotionTableRow from './NotionTableRow';

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
    { id: 'descripcion', label: 'Descripción', resizable: true, defaultWidth: 260, minWidth: 160, maxWidth: 600, sortable: false },
    { id: 'fecha', label: 'Fecha', resizable: false, defaultWidth: 90, sortable: true, sortId: 'date' },
    { id: 'cuenta', label: 'Cuenta', resizable: true, defaultWidth: 150, minWidth: 80, maxWidth: 300, sortable: true, sortId: 'account' },
    { id: 'monto', label: 'Monto', resizable: false, defaultWidth: 130, sortable: true, sortId: 'amount', align: 'right' },
  ];
}

export default function NotionTable({
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
    const parts = [];
    if (selectionMode) parts.push('32px');
    columns.forEach((col) => {
      const w = col.resizable ? (columnWidths[col.id] ?? col.defaultWidth) : col.defaultWidth;
      parts.push(`${w}px`);
    });
    parts.push('36px'); // actions
    return parts.join(' ');
  }, [columns, columnWidths, selectionMode]);

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
      className="overflow-x-auto rounded-xl"
      style={{ border: '1px solid var(--border-subtle)' }}
    >
      <div style={{ minWidth: 'max-content', width: '100%' }}>
        <NotionTableHeader
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
          <NotionTableRow
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
