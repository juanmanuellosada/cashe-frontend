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
            <Route path="/home" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <Home />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/nuevo" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <NewMovement />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/cuentas" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <Accounts />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/categorias" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <Categories />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/gastos" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <Expenses />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/ingresos" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <Income />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/transferencias" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <Transfers />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/estadisticas" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <Statistics />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/comparador" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <Comparador />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/resumen-categorias" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <CategorySummary />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/tarjetas" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <CreditCards />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/adjuntos" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <Attachments />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/integraciones" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <Integrations />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/presupuestos" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <Budgets />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/metas" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <Goals />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/recurrentes" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <Recurring />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/programadas" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <ScheduledTransactions />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/calendario" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <Calendar />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/configuracion" element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                  <Suspense fallback={<PageLoader />}>
                    <Settings darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
                  </Suspense>
                </Layout>
              </ProtectedRoute>
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
