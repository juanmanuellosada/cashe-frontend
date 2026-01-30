import { useState, useEffect, useRef } from 'react';
import { addCategory } from '../services/supabaseApi';
import CategoryIconPicker from './CategoryIconPicker';
import { isEmoji } from '../services/iconStorage';
import { getIconCatalogUrl } from '../hooks/useIconCatalog';

function CreateCategoryModal({ isOpen, onClose, type, onCategoryCreated }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(null);
  const [iconCatalogId, setIconCatalogId] = useState(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Store filename for preview
  const [catalogFilename, setCatalogFilename] = useState(null);

  // Drag to dismiss state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setIcon(null);
      setIconCatalogId(null);
      setCatalogFilename(null);
      setError('');
      setDragY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Handle touch start
  const handleTouchStart = (e) => {
    if (e.target.closest('[data-drag-handle]')) {
      startY.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  // Handle touch move
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) setDragY(diff);
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isDragging) return;
    if (dragY > 100 && !saving) onClose();
    setDragY(0);
    setIsDragging(false);
  };

  const isIncome = type === 'ingreso';
  const typeLabel = isIncome ? 'ingreso' : 'gasto';
  const accentColor = isIncome ? 'var(--accent-green)' : 'var(--accent-red)';

  const handleIconSelect = ({ type: iconType, value, iconCatalogId: catId }) => {
    if (iconType === 'logo') {
      setIcon(null);
      setIconCatalogId(catId);
      setCatalogFilename(value); // filename
    } else {
      setIcon(value);
      setIconCatalogId(null);
      setCatalogFilename(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!name.trim()) return;

    setSaving(true);
    setError('');

    try {
      // Build final name - prepend emoji if selected (and no catalog icon)
      let finalName = name.trim();
      const iconIsEmoji = icon && isEmoji(icon);
      if (iconIsEmoji && !iconCatalogId) {
        finalName = `${icon} ${finalName}`;
      }

      await addCategory({
        nombre: finalName,
        tipo: type,
        icon: (iconIsEmoji || iconCatalogId) ? null : icon,
        icon_catalog_id: iconCatalogId || null,
      });

      onCategoryCreated(finalName);
      setName('');
      setIcon(null);
      setIconCatalogId(null);
      setCatalogFilename(null);
      onClose();
    } catch (err) {
      console.error('Error creating category:', err);
      setError(err.message || 'Error al crear la categoría');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const hasIcon = icon || iconCatalogId;
  const backdropOpacity = Math.max(0.5 - (dragY / 300), 0);
  const shouldClose = dragY > 100;

  // Render icon preview
  const renderIconPreview = () => {
    if (iconCatalogId && catalogFilename) {
      return <img src={getIconCatalogUrl(catalogFilename)} alt="" className="w-7 h-7 rounded object-contain" />;
    }
    if (icon && isEmoji(icon)) {
      return <span className="text-xl">{icon}</span>;
    }
    return (
      <svg
        className="w-5 h-5"
        style={{ color: 'var(--text-muted)' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center">
      <div
        className="fixed inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm sm:m-4 mt-0 rounded-b-2xl sm:rounded-2xl p-5 animate-slide-down card-elevated"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          boxShadow: '0 25px 80px -20px rgba(0, 0, 0, 0.5)',
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          opacity: shouldClose ? 0.5 : 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag indicator - mobile only */}
        <div className="sm:hidden flex justify-center -mt-3 mb-2" data-drag-handle>
          <div
            className="w-10 h-1 rounded-full transition-colors"
            style={{
              backgroundColor: shouldClose ? 'var(--accent-red)' : 'var(--border-medium)',
            }}
          />
        </div>

        {/* Accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{ backgroundColor: accentColor }}
        />

        <div className="flex items-center gap-3 mb-4" data-drag-handle>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: accentColor }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Nueva categoría de {typeLabel}
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Se agregará a tu lista de categorías
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Icon selector + Name input */}
          <div className="flex gap-2 mb-3">
            {/* Icon button */}
            <button
              type="button"
              onClick={() => setShowIconPicker(true)}
              className="w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 border-2 border-dashed hover:border-solid"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: hasIcon ? accentColor : 'var(--border-medium)',
              }}
              title="Elegir ícono"
            >
              {renderIconPreview()}
            </button>

            {/* Name input */}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la categoría"
              className="flex-1 px-4 py-3 rounded-xl transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-primary)]"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm mb-3" style={{ color: 'var(--accent-red)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-medium transition-all"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              {saving ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>

      {/* Category Icon Picker */}
      <CategoryIconPicker
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        onSelect={handleIconSelect}
        currentIcon={icon}
        currentIconCatalogId={iconCatalogId}
      />
    </div>
  );
}

export default CreateCategoryModal;
