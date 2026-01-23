import { useState } from 'react';
import { addCategory } from '../services/supabaseApi';

function CreateCategoryModal({ isOpen, onClose, type, onCategoryCreated }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isIncome = type === 'ingreso';
  const typeLabel = isIncome ? 'ingreso' : 'gasto';
  const accentColor = isIncome ? 'var(--accent-green)' : 'var(--accent-red)';

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('CreateCategoryModal handleSubmit called');
    console.log('Name:', name.trim());
    console.log('Type:', type);
    
    if (!name.trim()) return;

    setSaving(true);
    setError('');

    try {
      console.log('Calling addCategory...');
      const result = await addCategory({
        nombre: name.trim(),
        tipo: type,
      });
      console.log('addCategory result:', result);
      onCategoryCreated(name.trim());
      setName('');
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
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la categoría"
            className="w-full px-4 py-3 rounded-xl mb-3 transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-primary)]"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            autoFocus
          />

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
    </div>
  );
}

export default CreateCategoryModal;
