import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import AnimatedBackground from '../components/AnimatedBackground';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const { signIn, signInWithGoogle, resetPassword, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/home';

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Email o contraseña incorrectos');
      } else if (error.message.includes('Email not confirmed')) {
        setError('Por favor confirmá tu email antes de iniciar sesión');
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      navigate(from, { replace: true });
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Ingresá tu email para recuperar la contraseña');
      return;
    }
    setLoading(true);
    setError('');

    const { error } = await resetPassword(email);

    if (error) {
      setError(error.message);
    } else {
      setResetEmailSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
      {/* Header */}
      <header className="p-4">
        <Link to="/" className="flex items-center gap-3 w-fit">
          <img
            src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
            alt="Cashé"
            className="w-10 h-10 rounded-xl"
          />
          <span className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
            Cashé
          </span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div 
          className="w-full max-w-md p-8 rounded-3xl"
          style={{ 
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <h1 
            className="font-display text-2xl font-bold text-center mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {showForgotPassword ? 'Recuperar contraseña' : 'Bienvenido de vuelta'}
          </h1>
          <p 
            className="text-center mb-6"
            style={{ color: 'var(--text-secondary)' }}
          >
            {showForgotPassword 
              ? 'Te enviaremos un email para restablecer tu contraseña'
              : 'Ingresá a tu cuenta para continuar'
            }
          </p>

          {resetEmailSent ? (
            <div 
              className="p-4 rounded-xl text-center mb-4"
              style={{ backgroundColor: 'var(--accent-green-dim)', color: 'var(--accent-green)' }}
            >
              <p className="font-medium">¡Email enviado!</p>
              <p className="text-sm mt-1">Revisá tu bandeja de entrada para restablecer tu contraseña</p>
            </div>
          ) : (
            <>
              {/* Google Login */}
              {!showForgotPassword && (
                <>
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-3 transition-all hover:opacity-90 active:scale-98"
                    style={{ 
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)'
                    }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continuar con Google
                  </button>

                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-medium)' }} />
                    <span style={{ color: 'var(--text-muted)' }} className="text-sm">o</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-medium)' }} />
                  </div>
                </>
              )}

              {/* Error message */}
              {error && (
                <div 
                  className="p-3 rounded-xl text-sm mb-4"
                  style={{ backgroundColor: 'var(--accent-red-dim)', color: 'var(--accent-red)' }}
                >
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={showForgotPassword ? handleForgotPassword : handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl outline-none transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-subtle)'
                      }}
                      placeholder="tu@email.com"
                      required
                    />
                  </div>

                  {!showForgotPassword && (
                    <div>
                      <label 
                        className="block text-sm font-medium mb-2"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Contraseña
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl outline-none transition-all"
                        style={{ 
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-subtle)'
                        }}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  )}
                </div>

                {!showForgotPassword && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm mt-3 hover:underline"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-semibold mt-6 transition-all hover:opacity-90 active:scale-98 disabled:opacity-50"
                  style={{ 
                    backgroundColor: 'var(--accent-green)',
                    color: '#000'
                  }}
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
                  ) : showForgotPassword ? (
                    'Enviar email'
                  ) : (
                    'Iniciar sesión'
                  )}
                </button>

                {showForgotPassword && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmailSent(false);
                      setError('');
                    }}
                    className="w-full py-3 px-4 rounded-xl font-medium mt-3 transition-all hover:opacity-80"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Volver al login
                  </button>
                )}
              </form>
            </>
          )}

          {!showForgotPassword && !resetEmailSent && (
            <p 
              className="text-center mt-6"
              style={{ color: 'var(--text-secondary)' }}
            >
              ¿No tenés cuenta?{' '}
              <Link 
                to="/register" 
                className="font-medium hover:underline"
                style={{ color: 'var(--accent-green)' }}
              >
                Registrate
              </Link>
            </p>
          )}
        </div>
      </main>
      </div>
    </div>
  );
};

export default Login;
