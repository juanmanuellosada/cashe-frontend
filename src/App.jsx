import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
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
    <BrowserRouter basename="/cashe-frontend">
      <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/nuevo" element={<NewMovement />} />
          <Route path="/cuentas" element={<Accounts />} />
          <Route path="/categorias" element={<Categories />} />
          <Route path="/gastos" element={<Expenses />} />
          <Route path="/ingresos" element={<Income />} />
          <Route path="/transferencias" element={<Transfers />} />
          <Route path="/estadisticas" element={<Statistics />} />
          <Route path="/comparador" element={<Comparador />} />
          <Route path="/resumen-categorias" element={<CategorySummary />} />
          <Route path="/tarjetas" element={<CreditCards />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
