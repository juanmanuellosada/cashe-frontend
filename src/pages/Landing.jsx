import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Landing = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If user is logged in, redirect to home
  if (user) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
            alt="Cashé"
            className="w-10 h-10 rounded-xl"
          />
          <span className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
            Cashé
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl font-medium text-sm transition-all hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 rounded-xl font-medium text-sm transition-all hover:opacity-90"
            style={{ 
              backgroundColor: 'var(--accent-green)',
              color: '#000'
            }}
          >
            Registrarse
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-2xl mx-auto">
          {/* Logo grande */}
          <div className="mb-8">
            <img
              src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
              alt="Cashé"
              className="w-24 h-24 mx-auto rounded-3xl"
              style={{ boxShadow: '0 8px 32px rgba(0, 217, 160, 0.3)' }}
            />
          </div>

          {/* Título */}
          <h1 
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            Tus finanzas,{' '}
            <span style={{ color: 'var(--accent-green)' }}>simplificadas</span>
          </h1>

          {/* Subtítulo */}
          <p 
            className="text-lg md:text-xl mb-8 max-w-lg mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            Controlá tus ingresos, gastos y transferencias en un solo lugar. 
            Multi-moneda, tarjetas de crédito y más.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-3 rounded-2xl font-semibold text-lg transition-all hover:scale-105 active:scale-95"
              style={{ 
                backgroundColor: 'var(--accent-green)',
                color: '#000',
                boxShadow: '0 4px 20px rgba(0, 217, 160, 0.4)'
              }}
            >
              Comenzar gratis
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 rounded-2xl font-semibold text-lg transition-all hover:opacity-80"
              style={{ 
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-medium)'
              }}
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto px-4">
          <FeatureCard
            icon="💰"
            title="Multi-moneda"
            description="Manejá pesos y dólares con tipo de cambio en tiempo real"
          />
          <FeatureCard
            icon="💳"
            title="Tarjetas de crédito"
            description="Controlá tus compras en cuotas y fechas de cierre"
          />
          <FeatureCard
            icon="📊"
            title="Estadísticas"
            description="Visualizá tus gastos por categoría y período"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center" style={{ color: 'var(--text-muted)' }}>
        <p className="text-sm">
          © 2026 Cashé. Hecho con 💚 para manejar tus finanzas.
        </p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div 
    className="p-6 rounded-2xl text-left"
    style={{ 
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)'
    }}
  >
    <div className="text-3xl mb-3">{icon}</div>
    <h3 
      className="font-semibold text-lg mb-2"
      style={{ color: 'var(--text-primary)' }}
    >
      {title}
    </h3>
    <p style={{ color: 'var(--text-secondary)' }}>{description}</p>
  </div>
);

export default Landing;
