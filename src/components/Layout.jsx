import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import SearchButton from './SearchButton';
import SearchModal from './SearchModal';
import EditMovementModal from './EditMovementModal';
import { getAccounts, getCategories, updateMovement, deleteMovement } from '../services/sheetsApi';

function Layout({ children, darkMode, toggleDarkMode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState({ ingresos: [], gastos: [] });
  const [savingMovement, setSavingMovement] = useState(false);
  const location = useLocation();

  // Load accounts and categories for edit modal
  useEffect(() => {
    async function loadData() {
      try {
        const [accountsData, categoriesData] = await Promise.all([
          getAccounts(),
          getCategories(),
        ]);
        setAccounts(accountsData.accounts || []);
        setCategories(categoriesData.categorias || { ingresos: [], gastos: [] });
      } catch (err) {
        console.error('Error loading data for search:', err);
      }
    }
    loadData();
  }, []);

  // Keyboard shortcut for search (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSaveMovement = async (updatedMovement) => {
    try {
      setSavingMovement(true);
      await updateMovement(updatedMovement);
      setEditingMovement(null);
      window.location.reload();
    } catch (err) {
      console.error('Error updating movement:', err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setSavingMovement(false);
    }
  };

  const handleDeleteMovement = async (movement) => {
    try {
      setSavingMovement(true);
      await deleteMovement(movement);
      setEditingMovement(null);
      window.location.reload();
    } catch (err) {
      console.error('Error deleting movement:', err);
      alert('Error al eliminar: ' + err.message);
    } finally {
      setSavingMovement(false);
    }
  };

  const menuItems = [
    { path: '/estadisticas', label: 'Estadisticas', icon: 'statistics', color: 'var(--accent-purple)' },
    { path: '/comparador', label: 'Comparador', icon: 'comparador', color: 'var(--accent-blue)' },
    { path: '/gastos', label: 'Gastos', icon: 'expense', color: 'var(--accent-red)' },
    { path: '/ingresos', label: 'Ingresos', icon: 'income', color: 'var(--accent-green)' },
    { path: '/transferencias', label: 'Transferencias', icon: 'transfer', color: 'var(--accent-blue)' },
    { path: '/cuentas', label: 'Cuentas', icon: 'accounts', color: 'var(--accent-primary)' },
    { path: '/categorias', label: 'Categorias', icon: 'categories', color: 'var(--accent-primary)' },
  ];

  const renderIcon = (icon, color) => {
    switch (icon) {
      case 'statistics':
        return (
          <svg className="w-5 h-5" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'comparador':
        return (
          <svg className="w-5 h-5" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        );
      case 'expense':
        return (
          <svg className="w-5 h-5" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        );
      case 'income':
        return (
          <svg className="w-5 h-5" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        );
      case 'transfer':
        return (
          <svg className="w-5 h-5" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'accounts':
        return (
          <svg className="w-5 h-5" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case 'categories':
        return (
          <svg className="w-5 h-5" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between backdrop-blur-lg"
        style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Finanzas
        </h1>
        <div className="flex items-center gap-1">
          <SearchButton onClick={() => setSearchOpen(true)} />
          <ThemeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        </div>
      </header>

      {/* Main Content with fade-in animation */}
      <main key={location.pathname} className="flex-1 px-4 py-4 pb-24 animate-fade-in">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg"
        style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center justify-around py-2 max-w-md mx-auto">
          {/* Home button */}
          <NavLink
            to="/"
            className="flex flex-col items-center px-4 py-2 rounded-xl transition-all duration-200"
            style={({ isActive }) => ({
              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
              backgroundColor: isActive ? 'var(--accent-primary-dim)' : 'transparent',
            })}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1 font-medium">Inicio</span>
          </NavLink>

          {/* New movement button with pulse effect */}
          <NavLink
            to="/nuevo"
            className="flex flex-col items-center px-3 py-2"
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center -mt-8 shadow-lg transition-all duration-300 hover:scale-105 ${
                location.pathname !== '/nuevo' ? 'animate-pulse-glow' : ''
              }`}
              style={{
                backgroundColor: 'var(--accent-primary)',
                boxShadow: '0 4px 20px rgba(96, 165, 250, 0.4)'
              }}
            >
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span
              className="text-xs mt-1 font-medium"
              style={{ color: location.pathname === '/nuevo' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
            >
              Nuevo
            </span>
          </NavLink>

          {/* Menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center px-4 py-2 rounded-xl transition-all duration-200"
            style={{
              color: menuOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
              backgroundColor: menuOpen ? 'var(--accent-primary-dim)' : 'transparent',
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-xs mt-1 font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Menu Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-72 p-5 animate-slide-in-right"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Menu
              </h2>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-tertiary)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-1">
              {menuItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                    color: isActive ? item.color : 'var(--text-primary)',
                  })}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    {renderIcon(item.icon, item.color)}
                  </div>
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* Footer info */}
            <div
              className="absolute bottom-5 left-5 right-5 pt-4"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                Finanzas Personales v1.0
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>

      {/* Search Modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onMovementClick={setEditingMovement}
      />

      {/* Edit Modal from Search */}
      {editingMovement && (
        <EditMovementModal
          movement={editingMovement}
          accounts={accounts}
          categories={categories}
          onSave={handleSaveMovement}
          onDelete={handleDeleteMovement}
          onClose={() => setEditingMovement(null)}
          loading={savingMovement}
        />
      )}
    </div>
  );
}

export default Layout;
