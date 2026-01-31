import { useState } from 'react';

function ForceUpdateButton() {
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState(null);

  const handleForceUpdate = async () => {
    setUpdating(true);
    setMessage(null);

    try {
      // 1. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // 2. Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
      }

      // 3. Clear localStorage (except auth)
      const authKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth'))) {
          authKeys.push({ key, value: localStorage.getItem(key) });
        }
      }
      localStorage.clear();
      // Restore auth
      authKeys.forEach(({ key, value }) => {
        if (value) localStorage.setItem(key, value);
      });

      setMessage('Cache limpiado. Recargando...');

      // 4. Navigate to root and reload (needed for GitHub Pages SPA routing)
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);

    } catch (err) {
      console.error('Error forcing update:', err);
      setMessage('Error al actualizar. Intentá recargar manualmente.');
      setUpdating(false);
    }
  };

  return (
    <div
      className="rounded-2xl p-6"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: 'var(--text-secondary)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Forzar actualización
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Si la app no funciona correctamente o hay una versión nueva, usá este botón para limpiar el cache y recargar.
          </p>

          {message && (
            <p
              className="text-sm mt-2 font-medium"
              style={{ color: 'var(--accent-primary)' }}
            >
              {message}
            </p>
          )}

          <button
            onClick={handleForceUpdate}
            disabled={updating}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
            }}
          >
            {updating ? 'Actualizando...' : 'Limpiar cache y recargar'}
          </button>

          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Versión: 2026.01.31-d
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForceUpdateButton;
