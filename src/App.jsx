import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, Suspense, lazy } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorProvider } from './contexts/ErrorContext'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorModal from './components/ErrorModal'
import UpdatePrompt from './components/UpdatePrompt'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'

// Public pages - loaded immediately for fast initial render
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import Privacy from './pages/Privacy'

// Protected pages - lazy loaded to reduce initial bundle size
const Home = lazy(() => import('./pages/Home'))
const NewMovement = lazy(() => import('./pages/NewMovement'))
const Accounts = lazy(() => import('./pages/Accounts'))
const Categories = lazy(() => import('./pages/Categories'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Income = lazy(() => import('./pages/Income'))
const Transfers = lazy(() => import('./pages/Transfers'))
const Statistics = lazy(() => import('./pages/Statistics'))
const Comparador = lazy(() => import('./pages/Comparador'))
const CategorySummary = lazy(() => import('./pages/CategorySummary'))
const CreditCards = lazy(() => import('./pages/CreditCards'))
const Attachments = lazy(() => import('./pages/Attachments'))
const Integrations = lazy(() => import('./pages/Integrations'))
const Budgets = lazy(() => import('./pages/Budgets'))
const Goals = lazy(() => import('./pages/Goals'))
const Recurring = lazy(() => import('./pages/Recurring'))
const ScheduledTransactions = lazy(() => import('./pages/ScheduledTransactions'))
const Calendar = lazy(() => import('./pages/Calendar'))
const Settings = lazy(() => import('./pages/Settings'))

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
    <LoadingSpinner size="lg" />
  </div>
)

// Protected routes configuration
const protectedRoutes = [
  { path: '/home', component: Home },
  { path: '/nuevo', component: NewMovement },
  { path: '/cuentas', component: Accounts },
  { path: '/categorias', component: Categories },
  { path: '/gastos', component: Expenses },
  { path: '/ingresos', component: Income },
  { path: '/transferencias', component: Transfers },
  { path: '/estadisticas', component: Statistics },
  { path: '/comparador', component: Comparador },
  { path: '/resumen-categorias', component: CategorySummary },
  { path: '/tarjetas', component: CreditCards },
  { path: '/adjuntos', component: Attachments },
  { path: '/integraciones', component: Integrations },
  { path: '/presupuestos', component: Budgets },
  { path: '/metas', component: Goals },
  { path: '/recurrentes', component: Recurring },
  { path: '/programadas', component: ScheduledTransactions },
  { path: '/calendario', component: Calendar },
]

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved !== null ? JSON.parse(saved) : true
  })

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
    if (darkMode) {
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
    }
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode(!darkMode)

  const basename = import.meta.env.BASE_URL === '/'
    ? '/'
    : import.meta.env.BASE_URL.replace(/\/$/, '')

  // Helper component for protected pages
  const ProtectedPage = ({ children }) => (
    <ProtectedRoute>
      <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </Layout>
    </ProtectedRoute>
  )

  return (
    <ErrorProvider>
      <AuthProvider>
        <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ErrorModal />
          <UpdatePrompt />
          <Routes>
            {/* Public routes - not lazy loaded for fast initial render */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacidad" element={<Privacy />} />

            {/* Protected routes - lazy loaded */}
            {protectedRoutes.map(({ path, component: Component }) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedPage>
                    <Component />
                  </ProtectedPage>
                }
              />
            ))}

            {/* Settings page - special case with additional props */}
            <Route path="/configuracion" element={
              <ProtectedPage>
                <Settings darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
              </ProtectedPage>
            } />

            {/* Catch all - redirect to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorProvider>
  )
}

export default App
