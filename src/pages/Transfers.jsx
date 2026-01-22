import { useState, useEffect } from 'react';
import { getAllTransfers, getAccounts, updateMovement, deleteMovement } from '../services/sheetsApi';
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
    try {
      setSaving(true);
      await deleteMovement(movement);
      setEditingMovement(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Error al eliminar: ' + err.message);
    } finally {
      setSaving(false);
    }
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
