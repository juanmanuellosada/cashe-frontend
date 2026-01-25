import { useState, useEffect } from 'react';
import { addCategory } from '../services/supabaseApi';
import IconPicker from './IconPicker';
import { isEmoji } from '../services/iconStorage';

function CreateCategoryModal({ isOpen, onClose, type, onCategoryCreated }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setIcon(null);
      setError('');
    }
  }, [isOpen]);

  const isIncome = type === 'ingreso';
  const typeLabel = isIncome ? 'ingreso' : 'gasto';
  const accentColor = isIncome ? 'var(--accent-green)' : 'var(--accent-red)';

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!name.trim()) return;

    setSaving(true);
    setError('');

    try {
      // Build final name - prepend emoji if selected
      let finalName = name.trim();
      const iconIsEmoji = icon && isEmoji(icon);
      if (iconIsEmoji) {
        finalName = `${icon} ${finalName}`;
      }

      const result = await addCategory({
        nombre: finalName,
        tipo: type,
        icon: iconIsEmoji ? null : icon, // Only save non-emoji icons to icon field
      });

      onCategoryCreated(finalName);
      setName('');
      setIcon(null);
      onClose();
    } catch (err) {
      console.error('Error creating category:', err);
      setError(err.message || 'Error al crear la categoría');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl p-5 animate-scale-in card-elevated"
        style={{ 
          backgroundColor: 'var(--bg-secondary)',
          boxShadow: '0 25px 80px -20px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{ backgroundColor: accentColor }}
        />

        <div className="flex items-center gap-3 mb-4">
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
                borderColor: icon ? accentColor : 'var(--border-medium)',
              }}
              title="Elegir ícono"
            >
              {icon ? (
                isEmoji(icon) ? (
                  <span className="text-xl">{icon}</span>
                ) : (
                  <img src={icon} alt="" className="w-7 h-7 rounded object-cover" />
                )
              ) : (
                <svg
                  className="w-5 h-5"
                  style={{ color: 'var(--text-muted)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
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

      {/* Icon Picker */}
      <IconPicker
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        onSelect={(selectedIcon) => {
          setIcon(selectedIcon);
          setShowIconPicker(false);
        }}
        currentValue={icon}
        title="Elegir ícono para la categoría"
      />
    </div>
  );
}

export default CreateCategoryModal;
