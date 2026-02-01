import { useState, useEffect, useCallback } from 'react';
import { getAllExpenses, getAccounts, getCategories, updateMovement, deleteMovement, bulkDeleteMovements, bulkUpdateMovements, updateSubsequentInstallments } from '../services/supabaseApi';
import MovementsList from '../components/MovementsList';
import EditMovementModal from '../components/EditMovementModal';
import NewMovementModal from '../components/NewMovementModal';
import PullToRefresh from '../components/PullToRefresh';
import { useError } from '../contexts/ErrorContext';
import { useDataEvent, DataEvents } from '../services/dataEvents';

function Expenses() {
  const { showError } = useError();
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState({ ingresos: [], gastos: [] });
  const [loading, setLoading] = useState(true);
  const [editingMovement, setEditingMovement] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchData = useCallback(async (forceRefresh = false, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [expensesData, accountsData, categoriesData] = await Promise.all([
        getAllExpenses(forceRefresh),
        getAccounts(),
        getCategories(),
      ]);
      setExpenses(expensesData.expenses || []);
      setAccounts(accountsData.accounts || []);
      setCategories(categoriesData.categorias || { ingresos: [], gastos: [] });
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Suscribirse a cambios de datos para refrescar automáticamente
  useDataEvent(DataEvents.EXPENSES_CHANGED, () => fetchData(true, false));

  const handleSave = async (movement) => {
    try {
      setSaving(true);
      await updateMovement(movement);

      // Si es cuota y el usuario eligió aplicar a las siguientes
      if (movement.applyToSubsequent && movement.idCompra) {
        await updateSubsequentInstallments(movement);
      }

      setEditingMovement(null);
      await fetchData(true, false); // Force refresh, no loading spinner
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
    await fetchData();
  };

  const handleBulkUpdate = async (movements, field, value) => {
    // Actualizar lista inmediatamente (optimistic)
    const rowIndexes = new Set(movements.map(m => m.rowIndex));
    setExpenses(prev => prev.map(e =>
      rowIndexes.has(e.rowIndex) ? { ...e, [field]: value } : e
    ));

    // Actualizar en background
    await bulkUpdateMovements(movements, field, value);
    await fetchData();
  };

  return (
    <PullToRefresh onRefresh={fetchData} disabled={loading}>
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
          onConvertedToRecurring={() => fetchData(true, false)}
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
    </PullToRefresh>
  );
}

export default Expenses;
