import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      // Check for updates every 5 minutes
      if (r) {
        setInterval(() => {
          r.update();
        }, 5 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setNeedRefresh(false);
  };

  if (!showPrompt) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50 animate-slide-up"
    >
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-medium)',
        }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--accent-primary-dim)' }}
        >
          <svg
            className="w-5 h-5"
            style={{ color: 'var(--accent-primary)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Nueva versión disponible
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Actualiza para ver las mejoras
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={handleUpdate}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            Actualizar
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdatePrompt;
