import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import AnimatedBackground from '../components/AnimatedBackground';

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
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="p-4 md:p-6 flex items-center justify-between">
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
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="px-3 sm:px-4 py-2 rounded-xl font-medium text-sm transition-all hover:opacity-80"
              style={{ color: 'var(--text-secondary)' }}
            >
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="px-3 sm:px-4 py-2 rounded-xl font-medium text-sm transition-all hover:opacity-90 hover:scale-105"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white'
              }}
            >
              Registrarse
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 text-center py-12">
          <div className="max-w-2xl mx-auto">
            {/* Logo grande con glow */}
            <div className="mb-8 relative">
              <div
                className="absolute inset-0 w-24 h-24 mx-auto rounded-3xl blur-xl opacity-50"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              />
              <img
                src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
                alt="Cashé"
                className="w-24 h-24 mx-auto rounded-3xl relative animate-float"
                style={{ boxShadow: '0 8px 32px rgba(20, 184, 166, 0.4)' }}
              />
            </div>

            {/* Título */}
            <h1
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4 animate-fade-in"
              style={{ color: 'var(--text-primary)' }}
            >
              Tus finanzas,{' '}
              <span className="relative">
                <span style={{ color: 'var(--accent-primary)' }}>simplificadas</span>
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 5.5C47.5 2 152.5 2 199 5.5"
                    stroke="var(--accent-primary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    style={{ opacity: 0.5 }}
                  />
                </svg>
              </span>
            </h1>

            {/* Subtítulo */}
            <p
              className="text-lg md:text-xl mb-10 max-w-lg mx-auto animate-fade-in stagger-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Controlá tus ingresos, gastos y transferencias en un solo lugar.
              Multi-moneda, tarjetas de crédito y más.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in stagger-2">
              <Link
                to="/register"
                className="group px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:scale-105 active:scale-95 relative overflow-hidden"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                  boxShadow: '0 4px 20px rgba(20, 184, 166, 0.4)'
                }}
              >
                <span className="relative z-10">Comenzar gratis</span>
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-primary-light) 0%, var(--accent-primary) 100%)'
                  }}
                />
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:scale-105 active:scale-95 backdrop-blur-sm"
                style={{
                  backgroundColor: 'var(--bg-glass)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-medium)'
                }}
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto px-4 w-full">
            <FeatureCard
              icon="💰"
              title="Multi-moneda"
              description="Manejá pesos y dólares con tipo de cambio en tiempo real"
              delay="0"
            />
            <FeatureCard
              icon="💳"
              title="Tarjetas de crédito"
              description="Controlá tus compras en cuotas y fechas de cierre"
              delay="1"
            />
            <FeatureCard
              icon="📊"
              title="Estadísticas"
              description="Visualizá tus gastos por categoría y período"
              delay="2"
            />
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center relative" style={{ color: 'var(--text-muted)' }}>
          <p className="text-sm">
            © 2026 Cashé. Hecho con 💚 para manejar tus finanzas.
          </p>
        </footer>
      </div>

    </div>
  );
};

const FeatureCard = ({ icon, title, description, delay }) => (
  <div
    className={`p-6 rounded-2xl text-left backdrop-blur-sm transition-all hover:scale-105 hover:shadow-lg animate-fade-in stagger-${delay}`}
    style={{
      backgroundColor: 'var(--bg-glass)',
      border: '1px solid var(--border-subtle)'
    }}
  >
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
      style={{ backgroundColor: 'var(--bg-tertiary)' }}
    >
      {icon}
    </div>
    <h3
      className="font-semibold text-lg mb-2"
      style={{ color: 'var(--text-primary)' }}
    >
      {title}
    </h3>
    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p>
  </div>
);

export default Landing;
