import { useState, useEffect } from 'react';
import { getAllExpenses, getAccounts, getCategories, updateMovement, deleteMovement, bulkDeleteMovements, bulkUpdateMovements } from '../services/supabaseApi';
import MovementsList from '../components/MovementsList';
import EditMovementModal from '../components/EditMovementModal';
import NewMovementModal from '../components/NewMovementModal';
import { useError } from '../contexts/ErrorContext';

function Expenses() {
  const { showError } = useError();
  const [expenses, setExpenses] = useState([]);
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
      const [expensesData, accountsData, categoriesData] = await Promise.all([
        getAllExpenses(),
        getAccounts(),
        getCategories(),
      ]);
      setExpenses(expensesData.expenses || []);
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
      await fetchData();
    } catch (err) {
      console.error('Error updating:', err);
      showError('No se pudo guardar el gasto', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (movement) => {
    // Cerrar modal y remover de lista inmediatamente (optimistic)
    setEditingMovement(null);
    setExpenses(prev => prev.filter(e => e.rowIndex !== movement.rowIndex));

    // Borrar en background
    try {
      await deleteMovement(movement);
    } catch (err) {
      console.error('Error deleting:', err);
      showError('No se pudo eliminar el gasto', err.message);
      // Recargar para recuperar estado real
      fetchData();
    }
  };

  const handleBulkDelete = async (movements) => {
    // Remover de lista inmediatamente (optimistic)
    const rowIndexes = new Set(movements.map(m => m.rowIndex));
    setExpenses(prev => prev.filter(e => !rowIndexes.has(e.rowIndex)));

    // Borrar en background
    await bulkDeleteMovements(movements);
    fetchData();
  };

  const handleBulkUpdate = async (movements, field, value) => {
    // Actualizar lista inmediatamente (optimistic)
    const rowIndexes = new Set(movements.map(m => m.rowIndex));
    setExpenses(prev => prev.map(e => 
      rowIndexes.has(e.rowIndex) ? { ...e, [field]: value } : e
    ));

    // Actualizar en background
    await bulkUpdateMovements(movements, field, value);
    fetchData();
  };

  return (
    <>
      <MovementsList
        title="Gastos"
        movements={expenses}
        accounts={accounts}
        categories={categories.gastos || []}
        loading={loading}
        onMovementClick={setEditingMovement}
        onMovementDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={handleBulkUpdate}
        onAddClick={() => setShowAddModal(true)}
        type="gasto"
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
        defaultType="expense"
      />
    </>
  );
}

export default Expenses;
