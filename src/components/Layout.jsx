import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import SearchButton from './SearchButton';
import ZoomControls from './ZoomControls';
import { useZoom } from '../contexts/ZoomContext';
import SearchModal from './SearchModal';
import EditMovementModal from './EditMovementModal';
import NewMovementModal from './NewMovementModal';
import Avatar from './Avatar';
import OfflineIndicator from './OfflineIndicator';
import { getAccounts, getCategories, updateMovement, deleteMovement, invalidateMovementCache } from '../services/supabaseApi';
import { emit, DataEvents } from '../services/dataEvents';
import { useAuth } from '../contexts/AuthContext';
import { useError } from '../contexts/ErrorContext';
import { useHaptics } from '../hooks/useHaptics';

function Layout({ children, darkMode, toggleDarkMode }) {
  const { user, profile, signOut } = useAuth();
  const { showError } = useError();
  const { zoom } = useZoom();
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
    { key: 'D', ctrl: false, alt: true, label: 'Adjuntos', action: () => navigate('/adjuntos') },
    { key: 'P', ctrl: false, alt: true, label: 'Presupuestos', action: () => navigate('/presupuestos') },
    { key: 'M', ctrl: false, alt: true, label: 'Metas', action: () => navigate('/metas') },
    { key: 'L', ctrl: false, alt: true, label: 'Calendario', action: () => navigate('/calendario') },
    { key: 'W', ctrl: false, alt: true, label: 'Recurrentes', action: () => navigate('/recurrentes') },
    { key: 'O', ctrl: false, alt: true, label: 'Reglas', action: () => navigate('/reglas') },
    { key: 'B', ctrl: false, alt: true, label: 'Colapsar menú', action: () => setSidebarCollapsed(prev => !prev) },
    { key: 'S', ctrl: false, alt: true, label: 'Configuración', action: () => navigate('/configuracion') },
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
    if (user) {
      loadData();
    }
  }, [user]);

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

  // Callback to notify children that data has changed (used by pages to refresh)
  const [dataVersion, setDataVersion] = useState(0);
  const haptics = useHaptics();

  const notifyDataChange = useCallback(() => {
    // Invalidate cache and increment version to trigger re-fetches
    invalidateMovementCache('movements');
    invalidateMovementCache('dashboard');
    setDataVersion(v => v + 1);
  }, []);

  const handleSaveMovement = async (updatedMovement) => {
    try {
      setSavingMovement(true);
      await updateMovement(updatedMovement);
      setEditingMovement(null);
      haptics.success();
      // Emitir eventos para propagar cambios a otros componentes
      const eventType = updatedMovement.tipo === 'ingreso' ? DataEvents.INCOMES_CHANGED :
                        updatedMovement.tipo === 'gasto' ? DataEvents.EXPENSES_CHANGED :
                        DataEvents.TRANSFERS_CHANGED;
      emit(eventType);
      emit(DataEvents.ACCOUNTS_CHANGED);
      // Notify data change instead of reloading
      notifyDataChange();
      // Navigate to trigger page refresh if needed
      navigate(location.pathname, { replace: true });
    } catch (err) {
      console.error('Error updating movement:', err);
      showError('No se pudo guardar el movimiento', err.message);
      haptics.error();
    } finally {
      setSavingMovement(false);
    }
  };

  const handleDeleteMovement = async (movement) => {
    // Cerrar modal inmediatamente (optimistic)
    setEditingMovement(null);
    haptics.warning();

    // Borrar en background
    try {
      await deleteMovement(movement);
      // Emitir eventos para propagar cambios a otros componentes
      const eventType = movement.tipo === 'ingreso' ? DataEvents.INCOMES_CHANGED :
                        movement.tipo === 'gasto' ? DataEvents.EXPENSES_CHANGED :
                        DataEvents.TRANSFERS_CHANGED;
      emit(eventType);
      emit(DataEvents.ACCOUNTS_CHANGED);
      // Notify data change instead of reloading
      notifyDataChange();
      // Navigate to trigger page refresh if needed
      navigate(location.pathname, { replace: true });
    } catch (err) {
      console.error('Error deleting movement:', err);
      showError('No se pudo eliminar el movimiento', err.message);
      haptics.error();
    }
  };

  const menuItems = [
    { path: '/estadisticas', label: 'Estadisticas', icon: 'statistics', color: 'var(--accent-purple)' },
    { path: '/comparador', label: 'Comparador', icon: 'comparador', color: 'var(--accent-blue)' },
    { path: '/resumen-categorias', label: 'Por categoría', icon: 'categorysum', color: 'var(--accent-primary)' },
    { path: '/presupuestos', label: 'Presupuestos', icon: 'budget', color: 'var(--accent-yellow)' },
    { path: '/metas', label: 'Metas', icon: 'goal', color: 'var(--accent-green)' },
    { path: '/calendario', label: 'Calendario', icon: 'calendar', color: 'var(--accent-blue)' },
    { path: '/gastos', label: 'Gastos', icon: 'expense', color: 'var(--accent-red)' },
    { path: '/ingresos', label: 'Ingresos', icon: 'income', color: 'var(--accent-green)' },
    { path: '/transferencias', label: 'Transferencias', icon: 'transfer', color: 'var(--accent-blue)' },
    { path: '/recurrentes', label: 'Recurrentes', icon: 'recurring', color: 'var(--accent-purple)' },
    { path: '/programadas', label: 'Programadas', icon: 'scheduled', color: 'var(--accent-orange)' },
    { path: '/tarjetas', label: 'Tarjetas', icon: 'creditcard', color: 'var(--accent-purple)' },
    { path: '/cuentas', label: 'Cuentas', icon: 'accounts', color: 'var(--accent-primary)' },
    { path: '/categorias', label: 'Categorias', icon: 'categories', color: 'var(--accent-primary)' },
    { path: '/adjuntos', label: 'Adjuntos', icon: 'attachments', color: 'var(--accent-primary)' },
    { path: '/integraciones', label: 'Integraciones', icon: 'integrations', color: 'var(--accent-primary)' },
    { path: '/reglas', label: 'Reglas', icon: 'rules', color: 'var(--accent-primary)' },
  ];

  const renderIcon = (icon) => {
    const iconClass = "w-full h-full";
    switch (icon) {
      case 'statistics':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'comparador':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        );
      case 'expense':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        );
      case 'income':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        );
      case 'transfer':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'accounts':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
        );
      case 'creditcard':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case 'categories':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        );
      case 'categorysum':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'attachments':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        );
      case 'integrations':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
      case 'budget':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'goal':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
      case 'calendar':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'recurring':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'scheduled':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'rules':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Desktop Sidebar */}
      {isDesktop && (
        <aside
          className={`fixed left-0 top-0 bottom-0 flex flex-col z-40 transition-all duration-200 ${sidebarCollapsed ? 'w-[68px]' : 'w-[240px]'}`}
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-subtle)'
          }}
        >
          {/* Sidebar Header */}
          <NavLink
            to="/"
            className={`p-3 flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'} hover:opacity-80 transition-all duration-200`}
            title="Ir al inicio"
          >
            <img
              src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
              alt="Cashé"
              className="w-9 h-9 rounded-xl flex-shrink-0"
            />
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h1 className="font-medium text-base tracking-tight whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>Cashé</h1>
              </div>
            )}
          </NavLink>

          {/* New Movement Button */}
          <div className={`${sidebarCollapsed ? 'px-2' : 'px-3'} mb-4`}>
            <button
              onClick={openNewMovement}
              className={`group flex items-center justify-center ${sidebarCollapsed ? 'w-11 h-11' : 'gap-2 w-full py-2.5'} rounded-lg font-medium transition-all duration-200`}
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-medium)'
              }}
              title={sidebarCollapsed ? 'Nuevo Movimiento (Alt+N)' : undefined}
            >
              <svg className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:rotate-90" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {!sidebarCollapsed && <span className="text-sm">Nuevo</span>}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className={`flex-1 ${sidebarCollapsed ? 'px-2' : 'px-3'} overflow-y-auto`}>
            <div className="mb-1">
              <NavLink
                to="/"
                end
                className={`group flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'} px-2.5 py-2 rounded-lg transition-all duration-150`}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                })}
                title={sidebarCollapsed ? 'Inicio' : undefined}
              >
                <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm">Inicio</span>}
              </NavLink>
            </div>

            {!sidebarCollapsed && (
              <p className="text-[10px] font-medium uppercase tracking-widest px-2.5 mb-1.5 mt-4" style={{ color: 'var(--text-muted)' }}>
                Análisis
              </p>
            )}
            {sidebarCollapsed && <div className="my-2 mx-2 border-t" style={{ borderColor: 'var(--border-subtle)' }} />}
            {menuItems.slice(0, 6).map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'} px-2.5 py-2 rounded-lg transition-all duration-150 mb-0.5`}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                })}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <div className="w-[18px] h-[18px] flex-shrink-0">{renderIcon(item.icon, isActive => isActive ? 'var(--text-primary)' : 'currentColor')}</div>
                {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
              </NavLink>
            ))}

            {!sidebarCollapsed && (
              <p className="text-[10px] font-medium uppercase tracking-widest px-2.5 mb-1.5 mt-4" style={{ color: 'var(--text-muted)' }}>
                Movimientos
              </p>
            )}
            {sidebarCollapsed && <div className="my-2 mx-2 border-t" style={{ borderColor: 'var(--border-subtle)' }} />}
            {menuItems.slice(6, 10).map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'} px-2.5 py-2 rounded-lg transition-all duration-150 mb-0.5`}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                })}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <div className="w-[18px] h-[18px] flex-shrink-0">{renderIcon(item.icon, 'currentColor')}</div>
                {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
              </NavLink>
            ))}

            {!sidebarCollapsed && (
              <p className="text-[10px] font-medium uppercase tracking-widest px-2.5 mb-1.5 mt-4" style={{ color: 'var(--text-muted)' }}>
                Ajustes
              </p>
            )}
            {sidebarCollapsed && <div className="my-2 mx-2 border-t" style={{ borderColor: 'var(--border-subtle)' }} />}
            {menuItems.slice(10).map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'} px-2.5 py-2 rounded-lg transition-all duration-150 mb-0.5`}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                })}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <div className="w-[18px] h-[18px] flex-shrink-0">{renderIcon(item.icon, 'currentColor')}</div>
                {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className={`${sidebarCollapsed ? 'p-2' : 'p-3'} border-t`} style={{ borderColor: 'var(--border-subtle)' }}>
            {/* User info */}
            {!sidebarCollapsed && user && (
              <div className="mb-2 flex items-center gap-2">
                <Avatar
                  src={profile?.avatar_url}
                  name={profile?.full_name}
                  email={user.email}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {profile?.full_name || 'Usuario'}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/configuracion')}
                  className="p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--text-muted)' }}
                  title="Configuración"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            )}
            <div className={`flex ${sidebarCollapsed ? 'flex-col items-center gap-1' : 'items-center justify-between'}`}>
              <ThemeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
              <div className="flex items-center gap-1">
                {sidebarCollapsed && (
                  <button
                    onClick={() => navigate('/configuracion')}
                    className="p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--bg-tertiary)]"
                    style={{ color: 'var(--text-muted)' }}
                    title="Configuración"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                  className="p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--text-muted)' }}
                  title="Cerrar sesión"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--text-muted)' }}
                  title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-200 ${isDesktop ? (sidebarCollapsed ? 'ml-[68px]' : 'ml-[240px]') : ''}`}>
        {/* Mobile Header */}
        {!isDesktop && (
          <header
            className="sticky top-0 z-50 safe-top overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-glass)',
              borderBottom: '1px solid var(--border-subtle)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)'
            }}
          >
            <div
              className="px-4 pt-2.5 pb-2.5 flex items-center justify-between"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                width: `${100 / zoom}%`,
              }}
            >
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 active:scale-95 transition-transform duration-150"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <img
                  src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
                  alt="Cashé"
                  className="w-8 h-8 rounded-lg"
                />
                <span className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>Cashé</span>
              </button>
              <div className="flex items-center gap-1">
                <ZoomControls compact />
                <SearchButton onClick={() => setSearchOpen(true)} />
                <ThemeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
              </div>
            </div>
          </header>
        )}

        {/* Desktop Header - Minimal */}
        {isDesktop && (
          <header
            className="sticky top-0 z-30 overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div
              className="px-6 py-3 flex items-center justify-between"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                width: `${100 / zoom}%`,
              }}
            >
              <div />
              <div className="flex items-center gap-2">
                <ZoomControls />
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors duration-150 hover:bg-[var(--bg-tertiary)]"
                  style={{
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-sm">Buscar...</span>
                  <kbd className="ml-2 px-1.5 py-0.5 text-[10px] rounded font-mono" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                    Alt+K
                  </kbd>
                </button>
                <button
                  onClick={() => setShortcutsOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors duration-150 hover:bg-[var(--bg-tertiary)]"
                  style={{
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)'
                  }}
                  title="Atajos de teclado"
                >
                  <span className="text-sm">Atajos</span>
                  <kbd className="ml-2 px-1.5 py-0.5 text-[10px] rounded font-mono" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                    Shift+?
                  </kbd>
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          <main
            key={location.pathname}
            className={`animate-fade-in ${isDesktop ? 'px-8 py-6' : 'px-2 xs:px-3 sm:px-4 py-3 sm:py-4 pb-24'}`}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: `${100 / zoom}%`,
              minHeight: zoom < 1 ? `${100 / zoom}%` : 'auto',
              overflowX: 'hidden',
            }}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      {!isDesktop && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
          style={{
            backgroundColor: 'var(--bg-glass)',
            borderTop: '1px solid var(--border-subtle)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)'
          }}
        >
          <div className="flex items-center justify-around py-1.5 px-2 max-w-md mx-auto">
            <NavLink
              to="/"
              className="flex flex-col items-center px-4 py-1.5 rounded-lg transition-colors duration-150 active:scale-95"
              style={({ isActive }) => ({
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              })}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-[10px] mt-0.5">Inicio</span>
            </NavLink>

            <NavLink
              to="/nuevo"
              className="flex flex-col items-center px-2"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center -mt-4 transition-transform duration-150 active:scale-95"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-medium)'
                }}
              >
                <svg className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span
                className="text-[10px] mt-1"
                style={{ color: location.pathname === '/nuevo' ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                Nuevo
              </span>
            </NavLink>

            <button
              onClick={() => setMenuOpen(true)}
              className="flex flex-col items-center px-4 py-1.5 rounded-lg transition-colors duration-150 active:scale-95"
              style={{
                color: menuOpen ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-[10px] mt-0.5">Menú</span>
            </button>
          </div>
        </nav>
      )}

      {/* Menu Drawer - Mobile Only */}
      {!isDesktop && menuOpen && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setMenuOpen(false)}
          />

          <div
            className="absolute right-0 top-0 bottom-0 w-[260px] animate-slide-in-right overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderLeft: '1px solid var(--border-subtle)'
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Menú</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--bg-tertiary)]"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-2 space-y-0.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors duration-150 active:scale-[0.98]"
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  })}
                >
                  <div className="w-[18px] h-[18px]">{renderIcon(item.icon)}</div>
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              ))}
            </div>

            <div
              className="absolute bottom-0 left-0 right-0 px-4 py-3"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-primary)'
              }}
            >
              {user && (
                <div className="flex items-center gap-2">
                  <Avatar
                    src={profile?.avatar_url}
                    name={profile?.full_name}
                    email={user.email}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {profile?.full_name || 'Usuario'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/configuracion');
                    }}
                    className="p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--bg-tertiary)]"
                    style={{ color: 'var(--text-muted)' }}
                    title="Configuración"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      await signOut();
                      navigate('/');
                    }}
                    className="p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--bg-tertiary)]"
                    style={{ color: 'var(--text-muted)' }}
                    title="Cerrar sesión"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              )}
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
