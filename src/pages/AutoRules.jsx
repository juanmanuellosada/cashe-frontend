import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Bot, Sparkles, CheckSquare, X, Trash2 } from 'lucide-react';
import { useAutoRules } from '../hooks/useAutoRules';
import { useError } from '../contexts/ErrorContext';
import { getAccounts, getCategories, createAutoRule, updateAutoRule, deleteAutoRule, toggleAutoRule, generateAllAutoRules } from '../services/supabaseApi';
import RuleFormModal from '../components/rules/RuleFormModal';
import RuleMobileCard from '../components/rules/RuleMobileCard';
import ConfirmModal from '../components/ConfirmModal';

function AutoRules() {
  const { showError } = useError();
  const location = useLocation();
  const { rules, loading: rulesLoading, refetch } = useAutoRules();

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Multi-select state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Cargar cuentas y categorías
  const loadData = useCallback(async () => {
    try {
      const [accountsData, categoriesData] = await Promise.all([
        getAccounts(),
        getCategories(),
      ]);
      setAccounts(accountsData.accounts || []);

      // Aplanar categorías de ingresos y gastos
      const cats = categoriesData.categorias || {};
      const allCategories = [
        ...(cats.gastos || []).map(c => ({ ...c, type: 'expense' })),
        ...(cats.ingresos || []).map(c => ({ ...c, type: 'income' })),
      ];
      setCategories(allCategories);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, location.key]);

  // Handlers
  const handleOpenModal = (rule = null) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const handleSave = async (data) => {
    try {
      setSaving(true);
      if (data.id) {
        await updateAutoRule(data.id, data);
      } else {
        await createAutoRule(data);
      }
      handleCloseModal();
      await refetch();
    } catch (err) {
      showError('Error al guardar la regla', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule) => {
    try {
      await toggleAutoRule(rule.id, !rule.is_active);
      await refetch();
    } catch (err) {
      showError('Error al cambiar estado', err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteAutoRule(deleteConfirm.id);
      setDeleteConfirm(null);
      await refetch();
    } catch (err) {
      showError('Error al eliminar', err.message);
    }
  };

  const handleGenerateAllRules = async () => {
    try {
      setGenerating(true);
      const result = await generateAllAutoRules();
      await refetch();
      // Mostrar toast de éxito (opcional)
      console.log(`✅ ${result.rulesCreated} reglas generadas exitosamente`);
    } catch (err) {
      showError('Error al generar reglas', err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Multi-select handlers
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedIds(new Set());
  };

  const handleSelect = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === rules.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rules.map(r => r.id)));
    }
  };

  const handleBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedIds);
      await Promise.all(idsToDelete.map(id => deleteAutoRule(id)));
      setBulkDeleteConfirm(false);
      setSelectedIds(new Set());
      setSelectionMode(false);
      await refetch();
    } catch (err) {
      showError('Error al eliminar', err.message);
    }
  };

  // Skeleton loader
  const renderSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-20 rounded-2xl animate-pulse"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        />
      ))}
    </div>
  );

  // Empty state
  const renderEmptyState = () => (
    <div
      className="rounded-2xl p-8 text-center max-w-2xl mx-auto"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div
        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
        style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)' }}
      >
        <Bot className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
      </div>

      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        ¿Qué son las reglas automáticas?
      </h3>

      <p className="text-sm mb-4 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
        Las reglas automáticas te permiten categorizar tus movimientos de forma inteligente,
        tanto en la app web como en el <strong>bot de WhatsApp/Telegram</strong>.
      </p>

      <div className="bg-opacity-50 rounded-xl p-4 mb-6 text-left max-w-md mx-auto" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Por ejemplo:</strong>
        </p>
        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          • Si la nota contiene "super" → 🛒 Supermercado<br />
          • Si la nota contiene "galicia" → 🏦 Galicia Pesos<br />
          • Si la nota contiene "spotify" → 📱 Servicios
        </p>
      </div>

      <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
        Cuando usás el bot, estas reglas ayudan a detectar automáticamente
        la categoría y cuenta correcta para cada movimiento.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={handleGenerateAllRules}
          disabled={generating}
          className="px-6 py-3 rounded-xl font-medium text-white transition-all inline-flex items-center justify-center gap-2"
          style={{
            backgroundColor: generating ? 'var(--text-tertiary)' : 'var(--accent-primary)',
            opacity: generating ? 0.6 : 1,
            cursor: generating ? 'not-allowed' : 'pointer'
          }}
        >
          <Sparkles className="w-5 h-5" />
          {generating ? 'Generando...' : 'Generar reglas automáticamente'}
        </button>

        <button
          onClick={() => handleOpenModal()}
          className="px-6 py-3 rounded-xl font-medium transition-all inline-flex items-center justify-center gap-2"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-medium)',
          }}
        >
          <Plus className="w-5 h-5" />
          Crear regla manualmente
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Sparkles className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            Reglas automáticas
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Categoriza tus movimientos automáticamente
          </p>
        </div>

        {rules.length > 0 && (
          <div className="flex items-center gap-2">
            {/* Toggle selection mode */}
            <button
              onClick={toggleSelectionMode}
              className="p-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: selectionMode ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: selectionMode ? 'white' : 'var(--text-secondary)',
                border: selectionMode ? 'none' : '1px solid var(--border-medium)',
              }}
              title={selectionMode ? 'Cancelar selección' : 'Seleccionar múltiples'}
            >
              {selectionMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
            </button>

            {!selectionMode && (
              <button
                onClick={() => handleOpenModal()}
                className="px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-medium)',
                }}
              >
                <Plus className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                Nueva
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {rulesLoading ? (
        renderSkeleton()
      ) : rules.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="space-y-3">
          {/* Select all when in selection mode */}
          {selectionMode && rules.length > 1 && (
            <button
              onClick={handleSelectAll}
              className="w-full py-2 text-sm font-medium rounded-xl transition-colors"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-medium)',
              }}
            >
              {selectedIds.size === rules.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </button>
          )}

          {rules.map((rule) => (
            <RuleMobileCard
              key={rule.id}
              rule={rule}
              categories={categories}
              accounts={accounts}
              onEdit={handleOpenModal}
              onDelete={setDeleteConfirm}
              onToggle={handleToggle}
              selectionMode={selectionMode}
              selected={selectedIds.has(rule.id)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* Modal de creación/edición */}
      {isModalOpen && (
        <RuleFormModal
          rule={editingRule}
          categories={categories}
          accounts={accounts}
          onSave={handleSave}
          onClose={handleCloseModal}
          onDelete={(rule) => {
            handleCloseModal();
            setDeleteConfirm(rule);
          }}
          loading={saving}
        />
      )}

      {/* Modal de confirmación de eliminación */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar regla"
        message={deleteConfirm ? `¿Estás seguro de eliminar la regla "${deleteConfirm.name}"? Esta acción no se puede deshacer.` : ''}
        confirmText="Eliminar"
        variant="danger"
      />

      {/* Modal de confirmación de eliminación múltiple */}
      <ConfirmModal
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Eliminar reglas"
        message={`¿Estás seguro de eliminar ${selectedIds.size} regla${selectedIds.size !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />

      {/* Floating action bar for selection mode */}
      {selectionMode && selectedIds.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-2xl shadow-lg flex items-center gap-4 z-50"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-medium)',
          }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setBulkDeleteConfirm(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--accent-red)',
            }}
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

export default AutoRules;
