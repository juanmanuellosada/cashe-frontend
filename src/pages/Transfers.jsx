import { useState, useEffect } from 'react';
import { getAllTransfers, getAccounts, updateMovement, deleteMovement, bulkDeleteMovements, bulkUpdateMovements } from '../services/sheetsApi';
import MovementsList from '../components/MovementsList';
import EditMovementModal from '../components/EditMovementModal';

function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMovement, setEditingMovement] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transfersData, accountsData] = await Promise.all([
        getAllTransfers(),
        getAccounts(),
      ]);
      setTransfers(transfersData.transfers || []);
      setAccounts(accountsData.accounts || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (movement) => {
    try {
      setSaving(true);
      await updateMovement(movement);
      setEditingMovement(null);
      fetchData();
    } catch (err) {
      console.error('Error updating:', err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (movement) => {
    // Cerrar modal y remover de lista inmediatamente (optimistic)
    setEditingMovement(null);
    setTransfers(prev => prev.filter(t => t.rowIndex !== movement.rowIndex));

    // Borrar en background
    try {
      await deleteMovement(movement);
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Error al eliminar: ' + err.message);
      // Recargar para recuperar estado real
      fetchData();
    }
  };

  const handleBulkDelete = async (movements) => {
    // Remover de lista inmediatamente (optimistic)
    const rowIndexes = new Set(movements.map(m => m.rowIndex));
    setTransfers(prev => prev.filter(t => !rowIndexes.has(t.rowIndex)));

    // Borrar en background
    await bulkDeleteMovements(movements);
    fetchData();
  };

  const handleBulkUpdate = async (movements, field, value) => {
    // Actualizar lista inmediatamente (optimistic)
    const rowIndexes = new Set(movements.map(m => m.rowIndex));
    setTransfers(prev => prev.map(t => 
      rowIndexes.has(t.rowIndex) ? { ...t, [field]: value } : t
    ));

    // Actualizar en background
    await bulkUpdateMovements(movements, field, value);
    fetchData();
  };

  return (
    <>
      <MovementsList
        title="Transferencias"
        movements={transfers}
        accounts={accounts}
        categories={[]}
        loading={loading}
        onMovementClick={setEditingMovement}
        onMovementDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={handleBulkUpdate}
        type="transferencia"
      />
      {editingMovement && (
        <EditMovementModal
          movement={editingMovement}
          accounts={accounts}
          categories={{ ingresos: [], gastos: [] }}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditingMovement(null)}
          loading={saving}
        />
      )}
    </>
  );
}

export default Transfers;
