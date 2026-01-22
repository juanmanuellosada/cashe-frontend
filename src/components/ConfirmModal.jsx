import { useEffect } from 'react';

/**
 * Modal de confirmación reutilizable
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Si el modal está abierto
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {Function} props.onConfirm - Función al confirmar
 * @param {string} props.title - Título del modal
 * @param {string} props.message - Mensaje de confirmación
 * @param {string} props.confirmText - Texto del botón confirmar (default: "Eliminar")
 * @param {string} props.cancelText - Texto del botón cancelar (default: "Cancelar")
 * @param {string} props.variant - Variante de color: "danger" | "warning" | "info" (default: "danger")
 * @param {boolean} props.loading - Si está procesando
 * @param {React.ReactNode} props.icon - Ícono personalizado (opcional)
 * @param {React.ReactNode} props.children - Contenido extra (opcional)
 */
function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar',
  message = '¿Estás seguro?',
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
  icon,
  children,
}) {
  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const getColors = () => {
    switch (variant) {
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          color: 'var(--accent-yellow)',
          button: 'var(--accent-yellow)',
        };
      case 'info':
        return {
          bg: 'rgba(59, 130, 246, 0.15)',
          color: 'var(--accent-blue)',
          button: 'var(--accent-blue)',
        };
      case 'danger':
      default:
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          color: 'var(--accent-red)',
          button: 'var(--accent-red)',
        };
    }
  };

  const colors = getColors();

  const defaultIcon = (
    <svg className="w-7 h-7" style={{ color: colors.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 animate-scale-in"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="text-center">
          <div
            className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: colors.bg }}
          >
            {icon || defaultIcon}
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            {message}
          </p>
          
          {children}
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3 rounded-xl font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: colors.button }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
