import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';
import { getExchangeRate, fetchAllDollarRates, updateExchangeRateType } from '../services/supabaseApi';
import { formatNumberAR } from '../utils/format';

const APP_VERSION = '2026.01.31-e';

// Tipos de dólar disponibles
const DOLLAR_TYPES = {
  oficial: { nombre: 'Oficial', descripcion: 'Banco Nación' },
  blue: { nombre: 'Blue', descripcion: 'Informal' },
  bolsa: { nombre: 'MEP', descripcion: 'Bolsa/MEP' },
  contadoconliqui: { nombre: 'CCL', descripcion: 'Contado con liquidación' },
};

function Settings({ darkMode, toggleDarkMode }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [clearing, setClearing] = useState(false);

  // Exchange rate state
  const [selectedRateType, setSelectedRateType] = useState('oficial');
  const [dollarRates, setDollarRates] = useState(null);
  const [loadingRates, setLoadingRates] = useState(true);
  const [updatingRate, setUpdatingRate] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Cargar tipo de cambio actual y cotizaciones
  useEffect(() => {
    const loadExchangeData = async () => {
      setLoadingRates(true);
      try {
        const [exchangeData, rates] = await Promise.all([
          getExchangeRate(),
          fetchAllDollarRates(),
        ]);
        setSelectedRateType(exchangeData.tipoUsado || 'oficial');
        setDollarRates(rates);
        if (exchangeData.fechaActualizacion) {
          setLastUpdated(new Date(exchangeData.fechaActualizacion));
        }
      } catch (err) {
        console.error('Error loading exchange data:', err);
      } finally {
        setLoadingRates(false);
      }
    };
    loadExchangeData();
  }, []);

  // Cambiar tipo de dólar
  const handleRateTypeChange = async (tipo) => {
    if (tipo === selectedRateType || updatingRate) return;

    setUpdatingRate(true);
    try {
      const result = await updateExchangeRateType(tipo);
      setSelectedRateType(tipo);
      if (result.fechaActualizacion) {
        setLastUpdated(new Date(result.fechaActualizacion));
      }
    } catch (err) {
      console.error('Error updating exchange rate type:', err);
    } finally {
      setUpdatingRate(false);
    }
  };

  // Refrescar cotizaciones
  const handleRefreshRates = async () => {
    setLoadingRates(true);
    try {
      const rates = await fetchAllDollarRates();
      setDollarRates(rates);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error refreshing rates:', err);
    } finally {
      setLoadingRates(false);
    }
  };

  // Formatear "hace X tiempo"
  const formatTimeAgo = (date) => {
    if (!date) return null;
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'hace un momento';
    if (diffMins < 60) return `hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours}h`;
    return `hace ${Math.floor(diffHours / 24)}d`;
  };

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
                <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Tema
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {darkMode ? 'Modo oscuro' : 'Modo claro'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
            aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {darkMode ? (
              <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Exchange Rate Section */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <span className="text-xl">💱</span>
          </div>
          <div>
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Tipo de cambio
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Elegí qué cotización del dólar usar para las conversiones
            </p>
          </div>
        </div>

        {/* Radio buttons para tipos de dólar */}
        <div className="space-y-2">
          {Object.entries(DOLLAR_TYPES).map(([key, { nombre, descripcion }]) => {
            const rate = dollarRates?.find(r => r.casa === key);
            const isSelected = key === selectedRateType;

            return (
              <button
                key={key}
                onClick={() => handleRateTypeChange(key)}
                disabled={updatingRate || loadingRates}
                className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
                style={{
                  backgroundColor: isSelected ? 'var(--accent-primary-dim)' : 'transparent',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                }}
              >
                {/* Radio circle */}
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    border: isSelected ? '2px solid var(--accent-primary)' : '2px solid var(--text-muted)',
                  }}
                >
                  {isSelected && (
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: 'var(--accent-primary)' }}
                    />
                  )}
                </div>

                {/* Label */}
                <div className="flex-1 text-left">
                  <p
                    className="text-sm font-medium"
                    style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}
                  >
                    {nombre}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {descripcion}
                  </p>
                </div>

                {/* Rate */}
                {rate && !loadingRates ? (
                  <span className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    ${formatNumberAR(rate.compra, 0)} / ${formatNumberAR(rate.venta, 0)}
                  </span>
                ) : loadingRates ? (
                  <div className="w-20 h-4 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Footer con última actualización y botón refresh */}
        <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {lastUpdated && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Última actualización: {formatTimeAgo(lastUpdated)}
            </p>
          )}
          <button
            onClick={handleRefreshRates}
            disabled={loadingRates}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            <svg
              className={`w-4 h-4 ${loadingRates ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar cotizaciones
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
