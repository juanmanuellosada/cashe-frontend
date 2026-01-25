import { useAuth } from '../contexts/AuthContext';
import { SESSION_CONFIG } from '../config/supabase';

function SessionExpiryWarning() {
  const { sessionExpiring, extendSession, signOut } = useAuth();

  if (!sessionExpiring) {
    return null;
  }

  const minutesLeft = Math.ceil(SESSION_CONFIG.WARNING_BEFORE_LOGOUT / 60000);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={extendSession}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 animate-scale-in"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <div className="text-center">
          {/* Warning icon */}
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(251, 191, 36, 0.15)',
            }}
          >
            <svg
              className="w-8 h-8"
              style={{ color: '#fbbf24' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h3
            className="text-lg font-bold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Sesión por expirar
          </h3>
          <p
            className="text-sm mb-5"
            style={{ color: 'var(--text-secondary)' }}
          >
            Tu sesión expirará en {minutesLeft} minuto{minutesLeft !== 1 ? 's' : ''} por inactividad.
            <br />
            ¿Querés seguir conectado?
          </p>

          <div className="flex gap-3">
            <button
              onClick={signOut}
              className="flex-1 py-3 rounded-xl font-semibold transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)'
              }}
            >
              Cerrar sesión
            </button>
            <button
              onClick={extendSession}
              className="flex-1 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--accent-primary)',
              }}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionExpiryWarning;
