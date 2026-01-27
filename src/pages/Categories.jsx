import { useState, useEffect, useMemo } from 'react';
import { getCategoriesAll, addCategory, updateCategory, deleteCategory, bulkDeleteCategories } from '../services/supabaseApi';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import { useError } from '../contexts/ErrorContext';
import CategoryIconPicker from '../components/CategoryIconPicker';
import { isEmoji, resolveIconPath } from '../services/iconStorage';
import { getIconCatalogUrl } from '../hooks/useIconCatalog';
import SortDropdown from '../components/SortDropdown';

function Categories() {
  const { showError } = useError();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('todos'); // 'todos', 'Ingreso', 'Gasto'
  const [deleteConfirm, setDeleteConfirm] = useState(null); // Categoría a eliminar
  const [toast, setToast] = useState(null);
  
  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Sorting
  const [sortConfig, setSortConfig] = useState({ sortBy: 'nombre', sortOrder: 'asc' });

  // Dynamic sort options - hide "tipo" when filtering by specific type
  const sortOptions = useMemo(() => {
    const options = [
      { id: 'nombre', label: 'Nombre', defaultOrder: 'asc' },
    ];
    // Only show "tipo" option when viewing all categories
    if (filter === 'todos') {
      options.push({ id: 'tipo', label: 'Tipo', defaultOrder: 'asc' });
    }
    return options;
  }, [filter]);

  // Reset sort to "nombre" if "tipo" was selected and filter changed to specific type
  useEffect(() => {
    if (filter !== 'todos' && sortConfig.sortBy === 'tipo') {
      setSortConfig(prev => ({ ...prev, sortBy: 'nombre' }));
    }
  }, [filter, sortConfig.sortBy]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

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
      showToast('Categoría creada correctamente');
      await fetchCategories();
    } catch (err) {
      console.error('Error adding category:', err);
      showError('No se pudo crear la categoría', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (formData) => {
    try {
      setSaving(true);
      await updateCategory(formData);
      setEditingCategory(null);
      showToast('Categoría actualizada correctamente');
      await fetchCategories();
    } catch (err) {
      console.error('Error updating category:', err);
      showError('No se pudo guardar la categoría', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    setDeleteConfirm(category);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setSaving(true);
      await deleteCategory(deleteConfirm.rowIndex);
      setDeleteConfirm(null);
      setEditingCategory(null);
      showToast('Categoría eliminada correctamente');
      await fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      showError('No se pudo eliminar la categoría', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Selection handlers
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedCategories([]);
  };

  const toggleCategorySelection = (categoryId) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const selectAll = () => {
    if (selectedCategories.length === filteredCategories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(filteredCategories.map(c => c.rowIndex));
    }
  };

  const handleBulkDelete = async () => {
    try {
      setSaving(true);
      await bulkDeleteCategories(selectedCategories);
      setBulkDeleteConfirm(false);
      setSelectedCategories([]);
      setSelectionMode(false);
      showToast(`${selectedCategories.length} categoría(s) eliminada(s)`);
      await fetchCategories();
    } catch (err) {
      console.error('Error deleting categories:', err);
      showError('No se pudieron eliminar las categorías', err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredAndSortedCategories = useMemo(() => {
    // First filter
    let result = filter === 'todos'
      ? [...categories]
      : categories.filter(c => c.tipo === filter);

    // Then sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortConfig.sortBy) {
        case 'nombre': {
          const nameA = (a.nombre || '').replace(/^[\p{Emoji}\u200d]+\s*/u, '').toLowerCase();
          const nameB = (b.nombre || '').replace(/^[\p{Emoji}\u200d]+\s*/u, '').toLowerCase();
          comparison = nameA.localeCompare(nameB, 'es');
          break;
        }
        case 'tipo':
          comparison = (a.tipo || '').localeCompare(b.tipo || '', 'es');
          break;
        default:
          comparison = 0;
      }

      return sortConfig.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [categories, filter, sortConfig]);

  // Alias for backwards compatibility
  const filteredCategories = filteredAndSortedCategories;

  const ingresosCount = categories.filter(c => c.tipo === 'Ingreso').length;
  const gastosCount = categories.filter(c => c.tipo === 'Gasto').length;

  // Extract emoji from category name or icon field
  const getCategoryIcon = (category) => {
    // First check if there's an icon_catalog
    if (category.icon_catalog?.filename) return { type: 'catalog', data: category.icon_catalog };
    // Then check icon field
    if (category.icon) return { type: 'icon', data: category.icon };
    // Then try to extract emoji from name
    const emojiMatch = category.nombre.match(/^[\p{Emoji}\u200d]+/u);
    return emojiMatch ? { type: 'emoji', data: emojiMatch[0] } : null;
  };

  // Get name without emoji
  const getNameWithoutEmoji = (nombre) => {
    return nombre.replace(/^[\p{Emoji}\u200d]+\s*/u, '').trim();
  };

  // Skeleton loading
  const renderSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
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
        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          {categories.length > 0 && (
            <SortDropdown
              options={sortOptions}
              value={sortConfig}
              onChange={setSortConfig}
              storageKey="cashe-sort-categories"
            />
          )}
          {/* Selection mode toggle */}
          {categories.length > 0 && (
            <button
              onClick={toggleSelectionMode}
              className={`p-2.5 rounded-xl transition-all duration-200 ${selectionMode ? 'ring-2 ring-offset-2' : ''}`}
              style={{
                backgroundColor: selectionMode ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: selectionMode ? 'white' : 'var(--text-secondary)',
                ringColor: 'var(--accent-primary)',
                ringOffsetColor: 'var(--bg-primary)'
              }}
              title={selectionMode ? 'Cancelar selección' : 'Seleccionar múltiples'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h7M4 12h7m-7 7h7m5-14v14m0-14l3 3m-3-3l-3 3m3 11l3-3m-3 3l-3-3" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:shadow-lg hover:scale-105"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            + Nueva
          </button>
        </div>
      </div>

      {/* Selection actions bar */}
      {selectionMode && (
        <div 
          className="flex items-center justify-between p-3 rounded-xl animate-fade-in"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--accent-primary)' }}
            >
              {selectedCategories.length === filteredCategories.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {selectedCategories.length} seleccionada(s)
            </span>
          </div>
          {selectedCategories.length > 0 && (
            <button
              onClick={() => setBulkDeleteConfirm(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
              style={{ backgroundColor: 'var(--accent-red-dim)', color: 'var(--accent-red)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar ({selectedCategories.length})
            </button>
          )}
        </div>
      )}

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
          {filteredCategories.map((category) => {
            const isIngreso = category.tipo === 'Ingreso';
            const iconInfo = getCategoryIcon(category);
            const nameWithoutEmoji = getNameWithoutEmoji(category.nombre);
            const isSelected = selectedCategories.includes(category.rowIndex);
            const isCatalogIcon = iconInfo?.type === 'catalog';
            const isEmojiIcon = iconInfo?.type === 'emoji' || (iconInfo?.type === 'icon' && isEmoji(iconInfo.data));

            return (
              <div
                key={category.rowIndex}
                className={`group relative rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02] cursor-pointer ${isSelected ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
                style={{
                  backgroundColor: isIngreso
                    ? 'var(--accent-green-dim)'
                    : 'var(--accent-red-dim)',
                  border: `1px solid ${isIngreso ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                }}
                onClick={() => selectionMode ? toggleCategorySelection(category.rowIndex) : setEditingCategory(category)}
              >
                {/* Checkbox for selection mode */}
                {selectionMode && (
                  <div
                    className="absolute top-2 left-2 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCategorySelection(category.rowIndex);
                    }}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${isSelected ? 'scale-110' : ''}`}
                      style={{
                        backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        border: isSelected ? 'none' : '2px solid var(--border-subtle)'
                      }}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}

                <div className={`flex items-start gap-3 ${selectionMode ? 'ml-6' : ''}`}>
                  {/* Icon badge */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
                    style={{
                      backgroundColor: (isCatalogIcon || (iconInfo && !isEmojiIcon))
                        ? 'transparent'
                        : isIngreso
                          ? 'rgba(34, 197, 94, 0.2)'
                          : 'rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    {isCatalogIcon ? (
                      <img
                        src={getIconCatalogUrl(iconInfo.data.filename)}
                        alt={iconInfo.data.name || category.nombre}
                        className="w-full h-full object-contain rounded-xl"
                      />
                    ) : iconInfo ? (
                      isEmojiIcon ? (
                        iconInfo.data
                      ) : (
                        <img
                          src={resolveIconPath(iconInfo.data)}
                          alt={category.nombre}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      )
                    ) : (
                      isIngreso ? '💰' : '💸'
                    )}
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

                {/* Edit button - appears on hover (only when not in selection mode) */}
                {!selectionMode && (
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
                )}
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
          onDelete={() => handleDelete(editingCategory)}
          onClose={() => setEditingCategory(null)}
          loading={saving}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Eliminar categoría"
        message={
          <>
            ¿Estás seguro de que quieres eliminar la categoría{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {deleteConfirm?.nombre}
            </span>
            ?
          </>
        }
        confirmText="Eliminar"
        loading={saving}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Eliminar categorías"
        message={
          <>
            ¿Estás seguro de que quieres eliminar{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {selectedCategories.length} categoría(s)
            </span>
            ? Esta acción no se puede deshacer.
          </>
        }
        confirmText={`Eliminar ${selectedCategories.length}`}
        loading={saving}
      />

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

function CategoryModal({ category, onSave, onDelete, onClose, loading }) {
  const isEditing = !!category;

  // Parse existing category to extract icon if it's stored in the name
  const parseExistingIcon = () => {
    if (category?.icon_catalog_id) return null; // Icon comes from catalog
    if (category?.icon) return category.icon;
    // Try to extract emoji from name
    const emojiMatch = category?.nombre?.match(/^[\p{Emoji}\u200d]+/u);
    return emojiMatch ? emojiMatch[0] : null;
  };

  const parseExistingName = () => {
    if (category?.icon || category?.icon_catalog_id) return category?.nombre || '';
    // Remove emoji from name if present
    return (category?.nombre || '').replace(/^[\p{Emoji}\u200d]+\s*/u, '').trim();
  };

  const [formData, setFormData] = useState({
    rowIndex: category?.rowIndex,
    id: category?.id,
    nombre: parseExistingName(),
    tipo: category?.tipo || 'Gasto',
    icon: parseExistingIcon(),
    icon_catalog_id: category?.icon_catalog_id || null,
  });
  const [catalogFilename, setCatalogFilename] = useState(category?.icon_catalog?.filename || null);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleIconSelect = ({ type: iconType, value, iconCatalogId }) => {
    if (iconType === 'logo') {
      setFormData(prev => ({ ...prev, icon: null, icon_catalog_id: iconCatalogId }));
      setCatalogFilename(value); // filename
    } else {
      setFormData(prev => ({ ...prev, icon: value, icon_catalog_id: null }));
      setCatalogFilename(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Combine icon and name for backward compatibility
    let finalName = formData.nombre;
    if (formData.icon && isEmoji(formData.icon) && !formData.icon_catalog_id) {
      // If icon is emoji, prepend it to name
      finalName = `${formData.icon} ${formData.nombre}`;
    }
    onSave({
      ...formData,
      nombre: finalName,
      icon: (formData.icon && isEmoji(formData.icon)) ? null : formData.icon,
      icon_catalog_id: formData.icon_catalog_id || null,
    });
  };

  const hasIcon = formData.icon || formData.icon_catalog_id;

  // Render the icon preview
  const renderIconPreview = () => {
    if (formData.icon_catalog_id && catalogFilename) {
      return (
        <img
          src={getIconCatalogUrl(catalogFilename)}
          alt="Ícono"
          className="w-full h-full object-contain rounded-xl"
        />
      );
    }
    if (formData.icon) {
      if (isEmoji(formData.icon)) {
        return <span className="text-2xl">{formData.icon}</span>;
      }
      return (
        <img
          src={resolveIconPath(formData.icon)}
          alt="Ícono"
          className="w-full h-full object-cover rounded-xl"
        />
      );
    }
    return <span className="text-2xl">{formData.tipo === 'Ingreso' ? '💰' : '💸'}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          {/* Icon selector */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ícono
            </label>
            <button
              type="button"
              onClick={() => setShowIconPicker(true)}
              className="w-full px-4 py-3 rounded-xl transition-all duration-200 border-2 border-dashed hover:border-solid flex items-center gap-3"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: hasIcon ? 'var(--accent-primary)' : 'var(--border-medium)',
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{
                  backgroundColor: hasIcon
                    ? (formData.icon_catalog_id ? 'transparent' : (formData.icon && isEmoji(formData.icon) ? (formData.tipo === 'Ingreso' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)') : 'transparent'))
                    : 'var(--bg-secondary)',
                }}
              >
                {renderIconPreview()}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {hasIcon ? 'Cambiar ícono' : 'Seleccionar ícono'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Emoji o logo del catálogo
                </p>
              </div>
              <svg
                className="w-5 h-5 flex-shrink-0"
                style={{ color: 'var(--text-muted)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

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
              placeholder="Ej: Comida, Transporte..."
              className="w-full px-4 py-3 rounded-xl border-2 border-transparent transition-colors focus:border-[var(--accent-primary)]"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              required
            />
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

        {/* Category Icon Picker Modal */}
        <CategoryIconPicker
          isOpen={showIconPicker}
          onClose={() => setShowIconPicker(false)}
          onSelect={handleIconSelect}
          currentIcon={formData.icon}
          currentIconCatalogId={formData.icon_catalog_id}
        />
      </div>
    </div>
  );
}

export default Categories;
