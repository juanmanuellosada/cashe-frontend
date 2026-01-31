import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';

const APP_VERSION = '2026.01.31-e';

function Settings({ darkMode, toggleDarkMode }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [clearing, setClearing] = useState(false);

  const handleForceUpdate = async () => {
    setClearing(true);

    try {
      // 1. Sign out first
      await signOut();

      // 2. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // 3. Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
      }

      // 4. Clear localStorage completely
      localStorage.clear();

      // 5. Clear sessionStorage
      sessionStorage.clear();

      // 6. Navigate to root and reload
      window.location.href = '/';
    } catch (err) {
      console.error('Error during force update:', err);
      window.location.href = '/';
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          Configuración
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Preferencias y opciones de la aplicación
        </p>
      </div>

      {/* User Profile Section */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
          Cuenta
        </h3>

        {user && (
          <div className="flex items-center gap-4">
            <Avatar
              src={profile?.avatar_url}
              name={profile?.full_name}
              email={user.email}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                {profile?.full_name || 'Usuario'}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {user.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
              style={{
                backgroundColor: 'var(--accent-red-dim)',
                color: 'var(--accent-red)',
              }}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {/* Appearance Section */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
          Apariencia
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              {darkMode ? (
                <svg className="w-6 h-6" style={{ color: 'var(--accent-yellow)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" style={{ color: 'var(--accent-yellow)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </div>
            <div>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Tema
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {darkMode ? 'Modo oscuro activado' : 'Modo claro activado'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className="relative w-14 h-8 rounded-full transition-colors duration-200"
            style={{
              backgroundColor: darkMode ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <span
              className="absolute top-1 w-6 h-6 rounded-full transition-all duration-200"
              style={{
                backgroundColor: 'white',
                left: darkMode ? 'calc(100% - 28px)' : '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}
            />
          </button>
        </div>
      </div>

      {/* App Update Section */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
          Aplicación
        </h3>

        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <svg className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Actualizar aplicación
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Si la app no funciona correctamente o hay problemas de caché, usá este botón para limpiar todos los datos locales, cerrar sesión y recargar con la última versión.
            </p>
            <button
              onClick={handleForceUpdate}
              disabled={clearing}
              className="mt-4 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {clearing ? 'Actualizando...' : 'Limpiar caché y recargar'}
            </button>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
          Acerca de
        </h3>

        <div className="flex items-center gap-4">
          <img
            src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
            alt="Cashé"
            className="w-16 h-16 rounded-2xl"
          />
          <div>
            <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
              Cashé
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Finanzas personales
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Versión {APP_VERSION}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
