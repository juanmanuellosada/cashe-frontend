import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../config/supabase';
import AnimatedBackground from '../components/AnimatedBackground';

function ResetPassword() {
  const [status, setStatus] = useState('loading'); // loading | ready | done | error | missing
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      setStatus('missing');
      setMessage('Link inválido o incompleto. Solicita nuevamente el correo de recuperación.');
      return;
    }

    const setSession = async () => {
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) {
        setStatus('error');
        setMessage(error.message || 'No se pudo validar el enlace.');
      } else {
        setStatus('ready');
      }
    };

    setSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setMessage('Ingresa una nueva contraseña.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus('error');
      setMessage(error.message || 'No se pudo actualizar la contraseña.');
    } else {
      setStatus('done');
      setMessage('Contraseña actualizada. Ya puedes iniciar sesión.');
    }
    setSubmitting(false);
  };

  const cardStyle = { backgroundColor: 'var(--bg-secondary)' };
  const textPrimary = { color: 'var(--text-primary)' };
  const textSecondary = { color: 'var(--text-secondary)' };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Animated Background */}
      <AnimatedBackground />
      <div className="w-full max-w-md rounded-2xl p-6 shadow-lg relative z-10" style={cardStyle}>
        <h1 className="text-xl font-semibold mb-2" style={textPrimary}>Recuperar contraseña</h1>
        <p className="text-sm mb-4" style={textSecondary}>
          Define una nueva contraseña para tu cuenta.
        </p>

        {message && (
          <div className="mb-4 text-sm p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)', color: status === 'error' ? 'var(--accent-red)' : 'var(--text-primary)' }}>
            {message}
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={textSecondary}>Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-primary)]"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                placeholder="••••••••"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60 transition-colors"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {submitting ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}

        {status === 'done' && (
          <div className="space-y-3">
            <p className="text-sm" style={textPrimary}>Tu contraseña fue actualizada.</p>
            <Link
              to="/login"
              className="block text-center py-3 rounded-xl font-semibold text-white"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              Ir a iniciar sesión
            </Link>
          </div>
        )}

        {status === 'loading' && (
          <p className="text-sm" style={textSecondary}>Validando enlace...</p>
        )}

        {status === 'missing' && (
          <div className="space-y-3">
            <p className="text-sm" style={textPrimary}>{message}</p>
            <Link
              to="/login"
              className="block text-center py-3 rounded-xl font-semibold text-white"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              Volver al login
            </Link>
          </div>
        )}

        {status === 'error' && message && !['ready', 'done', 'missing'].includes(status) && (
          <p className="text-sm" style={textPrimary}>{message}</p>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
