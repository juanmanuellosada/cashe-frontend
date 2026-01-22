import { useState, useEffect, useMemo } from 'react';
import { getCategoriesAll, addCategory, updateCategory, deleteCategory } from '../services/sheetsApi';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('todos'); // 'todos', 'Ingreso', 'Gasto'

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategoriesAll();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (formData) => {
    try {
      setSaving(true);
      await addCategory(formData);
      setIsAdding(false);
      fetchCategories();
    } catch (err) {
      console.error('Error adding category:', err);
      alert('Error al crear: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (formData) => {
    try {
      setSaving(true);
      await updateCategory(formData);
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      console.error('Error updating category:', err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rowIndex) => {
    if (!window.confirm('¿Estas seguro de que quieres eliminar esta categoria?')) return;

    try {
      setSaving(true);
      await deleteCategory(rowIndex);
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Error al eliminar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = filter === 'todos'
    ? categories
    : categories.filter(c => c.tipo === filter);

  const ingresosCount = categories.filter(c => c.tipo === 'Ingreso').length;
  const gastosCount = categories.filter(c => c.tipo === 'Gasto').length;

  // Extract emoji from category name
  const getEmoji = (nombre) => {
    const emojiMatch = nombre.match(/^[\p{Emoji}\u200d]+/u);
    return emojiMatch ? emojiMatch[0] : null;
  };

  // Get name without emoji
  const getNameWithoutEmoji = (nombre) => {
    return nombre.replace(/^[\p{Emoji}\u200d]+\s*/u, '').trim();
  };

  // Skeleton loading
  const renderSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="rounded-2xl p-4 animate-pulse"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl skeleton-shimmer"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            />
            <div className="flex-1 space-y-2">
              <div
                className="h-4 rounded skeleton-shimmer"
                style={{ backgroundColor: 'var(--bg-tertiary)', width: '70%' }}
              />
              <div
                className="h-3 rounded skeleton-shimmer"
                style={{ backgroundColor: 'var(--bg-tertiary)', width: '40%' }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Categorias
          </h2>
          <div
            className="w-20 h-10 rounded-xl skeleton-shimmer"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-8 w-24 rounded-full skeleton-shimmer"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            />
          ))}
        </div>
        {renderSkeleton()}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Categorias
        </h2>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:shadow-lg hover:scale-105"
          style={{ backgroundColor: 'var(--accent-primary)' }}
        >
          + Nueva
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { value: 'todos', label: `Todas (${categories.length})` },
          { value: 'Ingreso', label: `Ingresos (${ingresosCount})`, color: 'var(--accent-green)' },
          { value: 'Gasto', label: `Gastos (${gastosCount})`, color: 'var(--accent-red)' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className="px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200"
            style={{
              backgroundColor: filter === tab.value
                ? (tab.color || 'var(--accent-primary)')
                : 'var(--bg-tertiary)',
              color: filter === tab.value ? 'white' : 'var(--text-secondary)',
              boxShadow: filter === tab.value ? `0 4px 12px ${tab.color || 'var(--accent-primary)'}40` : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Categories grid */}
      {filteredCategories.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <svg className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            No hay categorias
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Crea tu primera categoria para organizar tus movimientos
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            + Crear categoria
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredCategories.map((category) => {
            const isIngreso = category.tipo === 'Ingreso';
            const emoji = getEmoji(category.nombre);
            const nameWithoutEmoji = getNameWithoutEmoji(category.nombre);

            return (
              <div
                key={category.rowIndex}
                className="group relative rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                style={{
                  backgroundColor: isIngreso
                    ? 'var(--accent-green-dim)'
                    : 'var(--accent-red-dim)',
                  border: `1px solid ${isIngreso ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                }}
                onClick={() => setEditingCategory(category)}
              >
                <div className="flex items-start gap-3">
                  {/* Emoji badge */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{
                      backgroundColor: isIngreso
                        ? 'rgba(34, 197, 94, 0.2)'
                        : 'rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    {emoji || (isIngreso ? '💰' : '💸')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {nameWithoutEmoji || category.nombre}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: isIngreso
                            ? 'var(--accent-green)'
                            : 'var(--accent-red)'
                        }}
                      />
                      <p
                        className="text-xs"
                        style={{
                          color: isIngreso
                            ? 'var(--accent-green)'
                            : 'var(--accent-red)'
                        }}
                      >
                        {category.tipo}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Edit button - appears on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCategory(category);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {isAdding && (
        <CategoryModal
          onSave={handleAdd}
          onClose={() => setIsAdding(false)}
          loading={saving}
        />
      )}

      {/* Edit Modal */}
      {editingCategory && (
        <CategoryModal
          category={editingCategory}
          onSave={handleUpdate}
          onDelete={() => handleDelete(editingCategory.rowIndex)}
          onClose={() => setEditingCategory(null)}
          loading={saving}
        />
      )}
    </div>
  );
}

function CategoryModal({ category, onSave, onDelete, onClose, loading }) {
  const isEditing = !!category;
  const [formData, setFormData] = useState({
    rowIndex: category?.rowIndex,
    nombre: category?.nombre || '',
    tipo: category?.tipo || 'Gasto',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 animate-scale-in"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {/* Drag indicator on mobile */}
        <div className="sm:hidden w-12 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: 'var(--bg-tertiary)' }} />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isEditing ? 'Editar Categoria' : 'Nueva Categoria'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ backgroundColor: 'transparent' }}
          >
            <svg className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Nombre
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: 🍔 Comida, 🚗 Transporte..."
              className="w-full px-4 py-3 rounded-xl border-2 border-transparent transition-colors focus:border-[var(--accent-primary)]"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              required
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
              Puedes agregar un emoji al inicio del nombre
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Tipo de categoria
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipo: 'Ingreso' }))}
                className="flex-1 py-3.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: formData.tipo === 'Ingreso' ? 'var(--accent-green)' : 'var(--bg-tertiary)',
                  color: formData.tipo === 'Ingreso' ? 'white' : 'var(--text-secondary)',
                  boxShadow: formData.tipo === 'Ingreso' ? '0 4px 12px rgba(34, 197, 94, 0.3)' : 'none',
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Ingreso
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipo: 'Gasto' }))}
                className="flex-1 py-3.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: formData.tipo === 'Gasto' ? 'var(--accent-red)' : 'var(--bg-tertiary)',
                  color: formData.tipo === 'Gasto' ? 'white' : 'var(--text-secondary)',
                  boxShadow: formData.tipo === 'Gasto' ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none',
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Gasto
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={loading}
                className="px-4 py-3.5 rounded-xl font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !formData.nombre}
              className="flex-1 py-3.5 rounded-xl font-semibold text-white disabled:opacity-50 transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isEditing ? 'Guardar' : 'Crear'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Categories;
