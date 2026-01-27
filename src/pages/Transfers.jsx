import { useState, useEffect } from 'react';
import { getAllTransfers, getAccounts, updateTransfer, deleteTransfer } from '../services/supabaseApi';
import MovementsList from '../components/MovementsList';
import EditMovementModal from '../components/EditMovementModal';
import NewMovementModal from '../components/NewMovementModal';
import { useError } from '../contexts/ErrorContext';

function Transfers() {
  const { showError } = useError();
  const [transfers, setTransfers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMovement, setEditingMovement] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

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

  const handleSave = async (transfer) => {
    try {
      setSaving(true);
      await updateTransfer(transfer);
      setEditingMovement(null);
      await fetchData();
    } catch (err) {
      console.error('Error updating:', err);
      showError('No se pudo guardar la transferencia', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (transfer) => {
    // Cerrar modal y remover de lista inmediatamente (optimistic)
    setEditingMovement(null);
    setTransfers(prev => prev.filter(t => t.rowIndex !== transfer.rowIndex));

    // Borrar en background
    try {
      await deleteTransfer(transfer);
    } catch (err) {
      console.error('Error deleting:', err);
      showError('No se pudo eliminar la transferencia', err.message);
      // Recargar para recuperar estado real
      fetchData();
    }
  };

  const handleBulkDelete = async (transfersToDelete) => {
    // Remover de lista inmediatamente (optimistic)
    const rowIndexes = new Set(transfersToDelete.map(t => t.rowIndex));
    setTransfers(prev => prev.filter(t => !rowIndexes.has(t.rowIndex)));

    // Borrar en background
    for (const transfer of transfersToDelete) {
      await deleteTransfer(transfer);
    }
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
        onAddClick={() => setShowAddModal(true)}
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
      <NewMovementModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          fetchData();
        }}
        defaultType="transfer"
      />
    </>
  );
}

export default Transfers;
