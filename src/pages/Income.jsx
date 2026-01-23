import { useState, useEffect } from 'react';
import { getAllIncomes, getAccounts, getCategories, updateMovement, deleteMovement, bulkDeleteMovements, bulkUpdateMovements } from '../services/supabaseApi';
import MovementsList from '../components/MovementsList';
import EditMovementModal from '../components/EditMovementModal';
import NewMovementModal from '../components/NewMovementModal';
import { useError } from '../contexts/ErrorContext';

function Income() {
  const { showError } = useError();
  const [incomes, setIncomes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState({ ingresos: [], gastos: [] });
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
      const [incomesData, accountsData, categoriesData] = await Promise.all([
        getAllIncomes(),
        getAccounts(),
        getCategories(),
      ]);
      setIncomes(incomesData.incomes || []);
      setAccounts(accountsData.accounts || []);
      setCategories(categoriesData.categorias || { ingresos: [], gastos: [] });
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
      // Esperar un momento antes de refetch para asegurar que el caché se limpió
      await fetchData();
    } catch (err) {
      console.error('Error updating:', err);
      showError('No se pudo guardar el ingreso', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (movement) => {
    // Cerrar modal y remover de lista inmediatamente (optimistic)
    setEditingMovement(null);
    setIncomes(prev => prev.filter(i => i.rowIndex !== movement.rowIndex));

    // Borrar en background
    try {
      await deleteMovement(movement);
    } catch (err) {
      console.error('Error deleting:', err);
      showError('No se pudo eliminar el ingreso', err.message);
      // Recargar para recuperar estado real
      fetchData();
    }
  };

  const handleBulkDelete = async (movements) => {
    // Remover de lista inmediatamente (optimistic)
    const rowIndexes = new Set(movements.map(m => m.rowIndex));
    setIncomes(prev => prev.filter(i => !rowIndexes.has(i.rowIndex)));

    // Borrar en background
    await bulkDeleteMovements(movements);
    fetchData();
  };

  const handleBulkUpdate = async (movements, field, value) => {
    // Actualizar lista inmediatamente (optimistic)
    const rowIndexes = new Set(movements.map(m => m.rowIndex));
    setIncomes(prev => prev.map(i => 
      rowIndexes.has(i.rowIndex) ? { ...i, [field]: value } : i
    ));

    // Actualizar en background
    await bulkUpdateMovements(movements, field, value);
    fetchData();
  };

  return (
    <>
      <MovementsList
        title="Ingresos"
        movements={incomes}
        accounts={accounts}
        categories={categories.ingresos || []}
        loading={loading}
        onMovementClick={setEditingMovement}
        onMovementDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={handleBulkUpdate}
        onAddClick={() => setShowAddModal(true)}
        type="ingreso"
      />
      {editingMovement && (
        <EditMovementModal
          movement={editingMovement}
          accounts={accounts}
          categories={categories}
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
        defaultType="income"
      />
    </>
  );
}

export default Income;
