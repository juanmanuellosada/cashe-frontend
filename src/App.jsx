import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorProvider } from './contexts/ErrorContext'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorModal from './components/ErrorModal'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import NewMovement from './pages/NewMovement'
import Accounts from './pages/Accounts'
import Categories from './pages/Categories'
import Expenses from './pages/Expenses'
import Income from './pages/Income'
import Transfers from './pages/Transfers'
import Statistics from './pages/Statistics'
import Comparador from './pages/Comparador'
import CategorySummary from './pages/CategorySummary'
import CreditCards from './pages/CreditCards'

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

  return (
    <ErrorProvider>
      <AuthProvider>
        <BrowserRouter basename="/cashe-frontend">
          <ErrorModal />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route path="/home" element={
            <ProtectedRoute>
              <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <Home />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/nuevo" element={
            <ProtectedRoute>
              <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <NewMovement />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/cuentas" element={
            <ProtectedRoute>
              <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <Accounts />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/categorias" element={
            <ProtectedRoute>
              <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <Categories />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/gastos" element={
            <ProtectedRoute>
              <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <Expenses />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/ingresos" element={
            <ProtectedRoute>
              <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <Income />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/transferencias" element={
            <ProtectedRoute>
              <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <Transfers />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/estadisticas" element={
            <ProtectedRoute>
              <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <Statistics />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/comparador" element={
            <ProtectedRoute>
              <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <Comparador />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/resumen-categorias" element={
            <ProtectedRoute>
              <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <CategorySummary />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/tarjetas" element={
            <ProtectedRoute>
              <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                <CreditCards />
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
