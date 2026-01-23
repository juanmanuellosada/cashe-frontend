import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import SearchButton from './SearchButton';
import SearchModal from './SearchModal';
import EditMovementModal from './EditMovementModal';
import NewMovementModal from './NewMovementModal';
import { getAccounts, getCategories, updateMovement, deleteMovement } from '../services/sheetsApi';

function Layout({ children, darkMode, toggleDarkMode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [newMovementOpen, setNewMovementOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState({ ingresos: [], gastos: [] });
  const [savingMovement, setSavingMovement] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Función para abrir nuevo movimiento (modal en desktop, página en mobile)
  const openNewMovement = () => {
    if (isDesktop) {
      setNewMovementOpen(true);
    } else {
      navigate('/nuevo');
    }
  };

  // Definición de atajos de teclado
  const keyboardShortcuts = [
    { key: 'K', alt: true, label: 'Buscar', action: () => setSearchOpen(true) },
    { key: 'N', alt: true, label: 'Nuevo movimiento', action: openNewMovement },
    { key: '?', ctrl: false, shift: true, label: 'Mostrar atajos', action: () => setShortcutsOpen(true) },
    { key: 'H', ctrl: false, alt: true, label: 'Ir al inicio', action: () => navigate('/') },
    { key: 'E', ctrl: false, alt: true, label: 'Estadísticas', action: () => navigate('/estadisticas') },
    { key: 'C', ctrl: false, alt: true, label: 'Comparador', action: () => navigate('/comparador') },
    { key: 'R', ctrl: false, alt: true, label: 'Por categoría', action: () => navigate('/resumen-categorias') },
    { key: 'G', ctrl: false, alt: true, label: 'Gastos', action: () => navigate('/gastos') },
    { key: 'I', ctrl: false, alt: true, label: 'Ingresos', action: () => navigate('/ingresos') },
    { key: 'T', ctrl: false, alt: true, label: 'Transferencias', action: () => navigate('/transferencias') },
    { key: 'J', ctrl: false, alt: true, label: 'Tarjetas', action: () => navigate('/tarjetas') },
    { key: 'U', ctrl: false, alt: true, label: 'Cuentas', action: () => navigate('/cuentas') },
    { key: 'A', ctrl: false, alt: true, label: 'Categorías', action: () => navigate('/categorias') },
    { key: 'B', ctrl: false, alt: true, label: 'Colapsar menú', action: () => setSidebarCollapsed(prev => !prev) },
    { key: 'Escape', ctrl: false, label: 'Cerrar modal', action: () => { setShortcutsOpen(false); setSearchOpen(false); setNewMovementOpen(false); } },
  ];

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Global keyboard shortcuts (desktop only)
  useEffect(() => {
    if (!isDesktop) return;

    const handleKeyDown = (e) => {
      // Ignore if typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        // Allow Escape to work even in inputs
        if (e.key !== 'Escape') return;
      }

      // Check each shortcut
      for (const shortcut of keyboardShortcuts) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const altMatch = shortcut.alt ? e.altKey : !shortcut.alt || !e.altKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !shortcut.shift || !e.shiftKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase() || e.key === shortcut.key;

        if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop, navigate, keyboardShortcuts]);

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
    // Cerrar modal inmediatamente (optimistic)
    setEditingMovement(null);

    // Borrar en background
    try {
      await deleteMovement(movement);
      // Recargar para actualizar datos
      window.location.reload();
    } catch (err) {
      console.error('Error deleting movement:', err);
      alert('Error al eliminar: ' + err.message);
    }
  };

  const menuItems = [
    { path: '/estadisticas', label: 'Estadisticas', icon: 'statistics', color: 'var(--accent-purple)' },
    { path: '/comparador', label: 'Comparador', icon: 'comparador', color: 'var(--accent-blue)' },
    { path: '/resumen-categorias', label: 'Por categoría', icon: 'categorysum', color: 'var(--accent-primary)' },
    { path: '/gastos', label: 'Gastos', icon: 'expense', color: 'var(--accent-red)' },
    { path: '/ingresos', label: 'Ingresos', icon: 'income', color: 'var(--accent-green)' },
    { path: '/transferencias', label: 'Transferencias', icon: 'transfer', color: 'var(--accent-blue)' },
    { path: '/tarjetas', label: 'Tarjetas', icon: 'creditcard', color: 'var(--accent-purple)' },
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
      case 'creditcard':
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
      case 'categorysum':
        return (
          <svg className="w-5 h-5" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Desktop Sidebar */}
      {isDesktop && (
        <aside
          className={`fixed left-0 top-0 bottom-0 flex flex-col z-40 transition-all duration-300 ${sidebarCollapsed ? 'w-[76px]' : 'w-[260px]'}`}
          style={{ 
            backgroundColor: 'var(--bg-secondary)', 
            borderRight: '1px solid var(--border-subtle)',
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)'
          }}
        >
          {/* Sidebar Header */}
          <NavLink 
            to="/"
            className={`p-4 flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} hover:opacity-80 transition-all duration-300`}
            title="Ir al inicio"
          >
            <div className="relative">
              <img
                src={`${import.meta.env.BASE_URL}favicon.png`}
                alt="Cashé"
                className="w-11 h-11 rounded-2xl flex-shrink-0 cursor-pointer transition-transform duration-300 hover:scale-105"
                style={{ boxShadow: '0 4px 12px rgba(139, 124, 255, 0.25)' }}
              />
              <div 
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                style={{ 
                  backgroundColor: 'var(--accent-green)', 
                  borderColor: 'var(--bg-secondary)',
                  boxShadow: '0 0 8px var(--accent-green-glow)'
                }}
              />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h1 className="font-display font-bold text-xl tracking-tight whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>Cashé</h1>
                <p className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>Finanzas Personales</p>
              </div>
            )}
          </NavLink>

          {/* New Movement Button */}
          <div className={`${sidebarCollapsed ? 'px-3' : 'px-4'} mb-5`}>
            <button
              onClick={openNewMovement}
              className={`group relative flex items-center justify-center ${sidebarCollapsed ? 'w-12 h-12' : 'gap-2.5 w-full py-3.5'} rounded-2xl font-semibold transition-all duration-300 overflow-hidden`}
              style={{ 
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-purple) 100%)',
                color: 'white',
                boxShadow: '0 4px 20px var(--accent-primary-glow)'
              }}
              title={sidebarCollapsed ? 'Nuevo Movimiento (Alt+N)' : undefined}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <svg className="w-5 h-5 flex-shrink-0 relative z-10 transition-transform duration-300 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              {!sidebarCollapsed && <span className="relative z-10 text-sm">Nuevo Movimiento</span>}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className={`flex-1 ${sidebarCollapsed ? 'px-2' : 'px-3'} overflow-y-auto`}>
            <div className="mb-2">
              <NavLink
                to="/"
                end
                className={`group flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 mb-1`}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'var(--accent-primary-dim)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                  boxShadow: isActive ? '0 2px 8px var(--accent-primary-dim)' : 'none'
                })}
                title={sidebarCollapsed ? 'Inicio' : undefined}
              >
                <svg className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {!sidebarCollapsed && <span className="font-medium">Inicio</span>}
              </NavLink>
            </div>

            {!sidebarCollapsed && (
              <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-2 mt-4" style={{ color: 'var(--text-secondary)' }}>
                Análisis
              </p>
            )}
            {sidebarCollapsed && <div className="my-3 mx-2 border-t" style={{ borderColor: 'var(--border-subtle)' }} />}
            {menuItems.slice(0, 3).map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 mb-1`}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? `${item.color}20` : 'transparent',
                  color: isActive ? item.color : 'var(--text-primary)',
                })}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {renderIcon(item.icon, item.color)}
                {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
              </NavLink>
            ))}

            {!sidebarCollapsed && (
              <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-2 mt-4" style={{ color: 'var(--text-secondary)' }}>
                Movimientos
              </p>
            )}
            {sidebarCollapsed && <div className="my-3 mx-2 border-t" style={{ borderColor: 'var(--border-subtle)' }} />}
            {menuItems.slice(3, 6).map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 mb-1`}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? `${item.color}20` : 'transparent',
                  color: isActive ? item.color : 'var(--text-primary)',
                })}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {renderIcon(item.icon, item.color)}
                {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
              </NavLink>
            ))}

            {!sidebarCollapsed && (
              <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-2 mt-4" style={{ color: 'var(--text-secondary)' }}>
                Configuración
              </p>
            )}
            {sidebarCollapsed && <div className="my-3 mx-2 border-t" style={{ borderColor: 'var(--border-subtle)' }} />}
            {menuItems.slice(6).map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-200 mb-1`}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? `${item.color}20` : 'transparent',
                  color: isActive ? item.color : 'var(--text-primary)',
                })}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {renderIcon(item.icon, item.color)}
                {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className={`${sidebarCollapsed ? 'p-2' : 'p-4'} border-t`} style={{ borderColor: 'var(--border-subtle)' }}>
            <div className={`flex ${sidebarCollapsed ? 'flex-col items-center gap-2' : 'items-center justify-between'}`}>
              <ThemeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
              {/* Collapse/Expand Button */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg transition-all duration-200 hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
              >
                <svg 
                  className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isDesktop ? (sidebarCollapsed ? 'ml-[76px]' : 'ml-[260px]') : ''}`}>
        {/* Mobile Header - Refined glass effect */}
        {!isDesktop && (
          <header
            className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between glass"
            style={{ 
              backgroundColor: 'var(--bg-glass)', 
              borderBottom: '1px solid var(--border-subtle)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)'
            }}
          >
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 active:scale-95 transition-all duration-200"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <div className="relative">
                <img
                  src={`${import.meta.env.BASE_URL}favicon.png`}
                  alt="Cashé"
                  className="w-9 h-9 rounded-xl"
                  style={{ boxShadow: '0 2px 8px rgba(139, 124, 255, 0.2)' }}
                />
              </div>
              <span className="text-lg font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Cashé</span>
            </button>
            <div className="flex items-center gap-2">
              <SearchButton onClick={() => setSearchOpen(true)} />
              <ThemeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
            </div>
          </header>
        )}

        {/* Desktop Header - Premium styling */}
        {isDesktop && (
          <header
            className="sticky top-0 z-30 px-8 py-5 flex items-center justify-between"
            style={{ 
              backgroundColor: 'var(--bg-primary)', 
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-5">
              {/* Shortcuts button */}
              <div>
                <h1 className="text-2xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {location.pathname === '/' && 'Dashboard'}
                  {location.pathname === '/nuevo' && 'Nuevo Movimiento'}
                  {location.pathname === '/gastos' && 'Gastos'}
                  {location.pathname === '/ingresos' && 'Ingresos'}
                  {location.pathname === '/transferencias' && 'Transferencias'}
                  {location.pathname === '/estadisticas' && 'Estadísticas'}
                  {location.pathname === '/comparador' && 'Comparador'}
                  {location.pathname === '/resumen-categorias' && 'Resumen por categoría'}
                  {location.pathname === '/cuentas' && 'Cuentas'}
                  {location.pathname === '/categorias' && 'Categorías'}
                  {location.pathname === '/tarjetas' && 'Tarjetas de Crédito'}
                </h1>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Gestiona tus finanzas personales
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSearchOpen(true)}
                className="group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 hover:shadow-md"
                style={{ 
                  backgroundColor: 'var(--bg-tertiary)', 
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-sm font-medium">Buscar...</span>
                <kbd className="ml-1 px-2 py-1 text-xs rounded-md font-mono" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                  Alt+K
                </kbd>
              </button>
              <button
                onClick={() => setShortcutsOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                title="Atajos de teclado (Shift+?)"
              >
                <span className="text-sm">Atajos</span>
                <kbd className="px-2 py-0.5 text-xs rounded font-mono" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  ?
                </kbd>
              </button>
            </div>
          </header>
        )}

        {/* Main Content with fade-in animation */}
        <main 
          key={location.pathname} 
          className={`flex-1 animate-fade-in ${isDesktop ? 'px-8 py-6' : 'px-4 py-5 pb-28'}`}
        >
          <div className={isDesktop ? 'max-w-6xl mx-auto' : ''}>
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Navigation - Mobile Only - Premium Design */}
      {!isDesktop && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
          style={{ 
            backgroundColor: 'var(--bg-glass)', 
            borderTop: '1px solid var(--border-subtle)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)'
          }}
        >
          <div className="flex items-center justify-around py-2 px-2 max-w-md mx-auto">
            {/* Home button */}
            <NavLink
              to="/"
              className="flex flex-col items-center px-5 py-2 rounded-2xl transition-all duration-300 active:scale-95"
              style={({ isActive }) => ({
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--accent-primary-dim)' : 'transparent',
              })}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-[10px] mt-1 font-medium tracking-wide">Inicio</span>
            </NavLink>

            {/* New movement button - Premium floating action */}
            <NavLink
              to="/nuevo"
              className="flex flex-col items-center px-2"
            >
              <div
                className={`relative w-[60px] h-[60px] rounded-[20px] flex items-center justify-center -mt-7 transition-all duration-300 active:scale-95 ${
                  location.pathname !== '/nuevo' ? 'animate-pulse-glow' : ''
                }`}
                style={{
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-purple) 100%)',
                  boxShadow: '0 8px 32px var(--accent-primary-glow), 0 4px 12px rgba(0,0,0,0.3)'
                }}
              >
                <div className="absolute inset-0 rounded-[20px] bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                <svg className="w-7 h-7 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span
                className="text-[10px] mt-1.5 font-medium tracking-wide"
                style={{ color: location.pathname === '/nuevo' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
              >
                Nuevo
              </span>
            </NavLink>

            {/* Menu button */}
            <button
              onClick={() => setMenuOpen(true)}
              className="flex flex-col items-center px-5 py-2 rounded-2xl transition-all duration-300 active:scale-95"
              style={{
                color: menuOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
                backgroundColor: menuOpen ? 'var(--accent-primary-dim)' : 'transparent',
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-[10px] mt-1 font-medium tracking-wide">Menú</span>
            </button>
          </div>
        </nav>
      )}

      {/* Menu Drawer - Mobile Only - Premium Slide Panel */}
      {!isDesktop && menuOpen && (
        <div className="fixed inset-0 z-[60]">
          {/* Backdrop with blur */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Slide panel */}
          <div
            className="absolute right-0 top-0 bottom-0 w-[280px] animate-slide-in-right overflow-hidden"
            style={{ 
              backgroundColor: 'var(--bg-secondary)',
              borderLeft: '1px solid var(--border-subtle)',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.5)'
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-3">
                <img
                  src="/cashe-frontend/icons/icon-192.png"
                  alt="Cashé"
                  className="w-10 h-10 rounded-xl"
                  style={{ boxShadow: '0 4px 16px var(--accent-primary-glow)' }}
                />
                <div>
                  <h2 className="text-base font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                    Menú
                  </h2>
                  <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    Cashé
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-95"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu items with stagger animation */}
            <div className="p-3 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              {menuItems.map((item, index) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 active:scale-[0.98] group"
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                    color: isActive ? item.color : 'var(--text-primary)',
                    animationDelay: `${index * 40}ms`
                  })}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    {renderIcon(item.icon, item.color)}
                  </div>
                  <span className="font-medium text-[15px]">{item.label}</span>
                  <svg 
                    className="w-4 h-4 ml-auto opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-50 group-hover:translate-x-0" 
                    style={{ color: 'var(--text-secondary)' }}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </NavLink>
              ))}
            </div>

            {/* Footer info with branding */}
            <div
              className="absolute bottom-0 left-0 right-0 px-5 py-4"
              style={{ 
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-primary)'
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Cashé
                </p>
                <p className="text-[10px] px-2 py-1 rounded-full" style={{ 
                  backgroundColor: 'var(--accent-primary-dim)',
                  color: 'var(--accent-primary)'
                }}>
                  v1.0
                </p>
              </div>
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

      {/* Keyboard Shortcuts Modal */}
      {shortcutsOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => setShortcutsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 animate-fade-in"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent-primary-dim)' }}
                >
                  <svg className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Atajos de Teclado
                </h2>
              </div>
              <button
                onClick={() => setShortcutsOpen(false)}
                className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-tertiary)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* General */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  General
                </p>
                <div className="space-y-2">
                  {keyboardShortcuts.filter(s => s.ctrl || s.key === 'Escape' || s.shift).map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{shortcut.label}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.ctrl && (
                          <kbd className="px-2 py-1 text-xs rounded font-mono" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-primary)' }}>
                            Ctrl
                          </kbd>
                        )}
                        {shortcut.shift && (
                          <kbd className="px-2 py-1 text-xs rounded font-mono" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-primary)' }}>
                            Shift
                          </kbd>
                        )}
                        {shortcut.alt && (
                          <kbd className="px-2 py-1 text-xs rounded font-mono" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-primary)' }}>
                            Alt
                          </kbd>
                        )}
                        <span className="text-xs mx-1" style={{ color: 'var(--text-secondary)' }}>+</span>
                        <kbd className="px-2 py-1 text-xs rounded font-mono" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-primary)' }}>
                          {shortcut.key}
                        </kbd>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navegación */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Navegación (Alt + Tecla)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {keyboardShortcuts.filter(s => s.alt && !s.ctrl).map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{shortcut.label}</span>
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-xs rounded font-mono" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-primary)' }}>
                          Alt
                        </kbd>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>+</span>
                        <kbd className="px-1.5 py-0.5 text-xs rounded font-mono" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-primary)' }}>
                          {shortcut.key}
                        </kbd>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                Presiona <kbd className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}>Esc</kbd> para cerrar
              </p>
            </div>
          </div>
        </div>
      )}

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

      {/* New Movement Modal (desktop only) */}
      <NewMovementModal 
        isOpen={newMovementOpen} 
        onClose={() => setNewMovementOpen(false)} 
      />
    </div>
  );
}

export default Layout;
