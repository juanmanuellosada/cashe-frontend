import { useState, useEffect } from 'react';
import { getAllExpenses, getAccounts, getCategories, updateMovement, deleteMovement } from '../services/sheetsApi';
import MovementsList from '../components/MovementsList';
import EditMovementModal from '../components/EditMovementModal';

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState({ ingresos: [], gastos: [] });
  const [loading, setLoading] = useState(true);
  const [editingMovement, setEditingMovement] = useState(null);
  const [saving, setSaving] = useState(false);

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
        title="Gastos"
        movements={expenses}
        accounts={accounts}
        categories={categories.gastos || []}
        loading={loading}
        onMovementClick={setEditingMovement}
        onMovementDelete={handleDelete}
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
    </>
  );
}

export default Expenses;
