import { useState } from 'react';
import { useError } from '../contexts/ErrorContext';

const ErrorModal = () => {
  const { error, clearError } = useError();
  const [showDetails, setShowDetails] = useState(false);

  if (!error) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={clearError}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {/* Header with icon */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            {/* Error Icon */}
            <div 
              className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-red-dim)' }}
            >
              <svg 
                className="w-6 h-6" 
                style={{ color: 'var(--accent-red)' }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            
            {/* Title and message */}
            <div className="flex-1 min-w-0">
              <h3 
                className="text-lg font-semibold mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                Ocurrió un error
              </h3>
              <p 
                className="text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {error.message}
              </p>
            </div>
          </div>
        </div>

        {/* Details section (collapsible) */}
        {error.details && (
          <div className="px-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg 
                className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showDetails ? 'Ocultar detalles técnicos' : 'Ver detalles técnicos'}
            </button>
            
            {showDetails && (
              <div 
                className="mt-3 p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto"
                style={{ 
                  backgroundColor: 'var(--bg-primary)', 
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-primary)'
                }}
              >
                <pre className="whitespace-pre-wrap break-words">
                  {error.details}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Footer with button */}
        <div className="p-6 pt-4 flex justify-end">
          <button
            onClick={clearError}
            className="px-6 py-2.5 rounded-xl font-medium text-sm transition-all hover:opacity-90 active:scale-95"
            style={{ 
              backgroundColor: 'var(--accent-primary)',
              color: '#000'
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
