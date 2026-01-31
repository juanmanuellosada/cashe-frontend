import { useState, useEffect, useRef } from 'react';
import { EMOJI_CATEGORIES, searchEmojis, getAllEmojis } from '../data/emojis';
import { useIconCatalog, getIconCatalogUrl } from '../hooks/useIconCatalog';
import { uploadIcon, listUserIcons, deleteIcon, getPathFromUrl, resolveIconPath } from '../services/iconStorage';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal';

/**
 * Modal selector de íconos para categorías.
 * Tab "Logos": logos del catálogo icon_catalog con búsqueda y filtro por categoría.
 * Tab "Emojis": emojis existentes con búsqueda y filtro por categoría de emoji.
 * Tab "Subir": subir íconos personalizados.
 *
 * onSelect({ type: 'emoji' | 'logo' | 'upload', value, iconCatalogId })
 */
export default function CategoryIconPicker({
  isOpen,
  onClose,
  onSelect,
  currentIcon,
  currentIconCatalogId,
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('logo');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState('all');
  const [selectedLogoCategory, setSelectedLogoCategory] = useState('all');
  const modalRef = useRef(null);
  const chipsRef = useRef(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedIcons, setUploadedIcons] = useState([]);
  const [loadingUploaded, setLoadingUploaded] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, iconPath: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef(null);

  // Drag to dismiss state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  const {
    icons: catalogIcons,
    loading: catalogLoading,
    groupedIcons,
    categories: catalogCategories,
    searchIcons,
    getIconUrl,
  } = useIconCatalog();

  // Load uploaded icons when opening
  useEffect(() => {
    if (isOpen && user) {
      loadUploadedIcons();
    }
  }, [isOpen, user]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedEmojiCategory('all');
      setSelectedLogoCategory('all');
      setUploadError(null);
      setDragY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (deleteConfirm.isOpen) return;
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose, deleteConfirm.isOpen]);

  // Handle touch start
  const handleTouchStart = (e) => {
    if (e.target.closest('[data-drag-handle]')) {
      startY.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  // Handle touch move
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) setDragY(diff);
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isDragging) return;
    if (dragY > 100) onClose();
    setDragY(0);
    setIsDragging(false);
  };

  // --- Upload handlers ---
  const loadUploadedIcons = async () => {
    if (!user) return;
    setLoadingUploaded(true);
    try {
      const icons = await listUserIcons(user.id);
      setUploadedIcons(icons);
    } catch (err) {
      console.error('Error loading uploaded icons:', err);
    } finally {
      setLoadingUploaded(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const { url } = await uploadIcon(file, user.id);
      await loadUploadedIcons();
      onSelect({ type: 'upload', value: url, iconCatalogId: null });
      onClose();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteIcon = (iconPath, e) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, iconPath });
  };

  const confirmDeleteIcon = async () => {
    const iconPath = deleteConfirm.iconPath;
    if (!iconPath) return;

    setIsDeleting(true);
    try {
      await deleteIcon(iconPath);
      setUploadedIcons(prev => prev.filter(i => i.path !== iconPath));
      if (currentIcon && getPathFromUrl(currentIcon) === iconPath) {
        onSelect({ type: 'emoji', value: null, iconCatalogId: null });
      }
      setDeleteConfirm({ isOpen: false, iconPath: null });
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectUploaded = (icon) => {
    onSelect({ type: 'upload', value: icon.url, iconCatalogId: null });
    onClose();
  };

  // --- Emoji filtering ---
  const getFilteredEmojis = () => {
    if (searchTerm) return searchEmojis(searchTerm);
    if (selectedEmojiCategory === 'all') return getAllEmojis();
    const cat = EMOJI_CATEGORIES.find(c => c.id === selectedEmojiCategory);
    return cat ? cat.emojis : [];
  };

  // --- Logo filtering ---
  const getFilteredLogos = () => {
    if (searchTerm) return searchIcons(searchTerm);
    if (selectedLogoCategory === 'all') return catalogIcons;
    return groupedIcons[selectedLogoCategory] || [];
  };

  const handleSelectEmoji = (emoji) => {
    onSelect({ type: 'emoji', value: emoji.emoji, iconCatalogId: null });
    onClose();
  };

  const handleSelectLogo = (icon) => {
    onSelect({ type: 'logo', value: icon.filename, iconCatalogId: icon.id });
    onClose();
  };

  const handleClear = () => {
    onSelect({ type: 'emoji', value: null, iconCatalogId: null });
    onClose();
  };

  // --- Scroll chips with mouse wheel (native listener to avoid passive issue) ---
  useEffect(() => {
    const el = chipsRef.current;
    if (!el || !isOpen) return;
    const handler = (e) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [isOpen, activeTab, searchTerm]);

  if (!isOpen) return null;

  const hasCurrentIcon = currentIcon || currentIconCatalogId;
  const showSearch = activeTab === 'logo' || activeTab === 'emoji';
  const showChips = showSearch && !searchTerm;
  const backdropOpacity = Math.max(0.6 - (dragY / 300), 0);
  const shouldClose = dragY > 100;

  return (
    <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center overflow-y-auto sm:py-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
        onClick={() => !deleteConfirm.isOpen && onClose()}
      />

      <div
        ref={modalRef}
        className="relative w-full max-w-md sm:mx-4 mt-0 rounded-b-2xl sm:rounded-2xl overflow-hidden shadow-2xl animate-slide-down max-h-[85vh] sm:max-h-[calc(100vh-48px)] flex flex-col"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          opacity: shouldClose ? 0.5 : 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag indicator - mobile only */}
        <div className="sm:hidden flex justify-center pt-2 pb-1" data-drag-handle>
          <div
            className="w-10 h-1 rounded-full transition-colors"
            style={{
              backgroundColor: shouldClose ? 'var(--accent-red)' : 'var(--border-medium)',
            }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 cursor-grab active:cursor-grabbing sm:cursor-default"
          style={{ borderBottom: '1px solid var(--border-color)' }}
          data-drag-handle
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Elegir ícono
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg width={20} height={20} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-3 gap-2">
          {[
            { id: 'logo', label: 'Logos' },
            { id: 'emoji', label: 'Emojis' },
            { id: 'upload', label: 'Subir' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-teal-500/20 text-teal-400'
                  : 'hover:bg-white/5'
              }`}
              style={{ color: activeTab === tab.id ? undefined : 'var(--text-secondary)' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search bar (logo & emoji tabs) */}
        {showSearch && (
          <div className="px-5 pt-4">
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            >
              <svg width={18} height={18} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={activeTab === 'emoji' ? 'Buscar emoji...' : 'Buscar logo...'}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--text-primary)' }}
                autoFocus
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="p-1 rounded hover:bg-white/10">
                  <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Category chips with horizontal scroll */}
        {showChips && (
          <div className="px-5 pt-3 relative">
            <div
              ref={chipsRef}
              className="flex gap-2 overflow-x-auto pb-2 chips-scroll"
            >
              <button
                onClick={() => activeTab === 'emoji' ? setSelectedEmojiCategory('all') : setSelectedLogoCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  (activeTab === 'emoji' ? selectedEmojiCategory : selectedLogoCategory) === 'all'
                    ? 'bg-teal-500/20 text-teal-400'
                    : 'hover:bg-white/5'
                }`}
                style={{
                  color: (activeTab === 'emoji' ? selectedEmojiCategory : selectedLogoCategory) === 'all'
                    ? undefined
                    : 'var(--text-secondary)',
                }}
              >
                Todos
              </button>
              {activeTab === 'emoji'
                ? EMOJI_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedEmojiCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                        selectedEmojiCategory === cat.id
                          ? 'bg-teal-500/20 text-teal-400'
                          : 'hover:bg-white/5'
                      }`}
                      style={{ color: selectedEmojiCategory === cat.id ? undefined : 'var(--text-secondary)' }}
                    >
                      {cat.name}
                    </button>
                  ))
                : catalogCategories.map(catName => (
                    <button
                      key={catName}
                      onClick={() => setSelectedLogoCategory(catName)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                        selectedLogoCategory === catName
                          ? 'bg-teal-500/20 text-teal-400'
                          : 'hover:bg-white/5'
                      }`}
                      style={{ color: selectedLogoCategory === catName ? undefined : 'var(--text-secondary)' }}
                    >
                      {catName}
                    </button>
                  ))
              }
            </div>
          </div>
        )}

        {/* Error message */}
        {uploadError && (
          <div className="mx-5 mt-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{uploadError}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-5 min-h-0 flex-1 overflow-y-auto">
          {/* Logo grid */}
          {activeTab === 'logo' && (
            <>
              {catalogLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  {getFilteredLogos().map(icon => (
                    <button
                      key={icon.id}
                      onClick={() => handleSelectLogo(icon)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all hover:bg-white/10 ${
                        currentIconCatalogId === icon.id ? 'ring-2 ring-teal-500 bg-teal-500/10' : ''
                      }`}
                      title={icon.name}
                    >
                      <img
                        src={getIconUrl(icon.filename)}
                        alt={icon.name}
                        className="w-10 h-10 rounded-lg object-contain"
                        loading="lazy"
                      />
                      <span
                        className="text-[10px] text-center truncate w-full leading-tight"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {icon.name}
                      </span>
                    </button>
                  ))}
                  {getFilteredLogos().length === 0 && (
                    <div className="col-span-5 py-8 text-center">
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        No se encontraron logos
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Emoji grid */}
          {activeTab === 'emoji' && (
            <div className="grid grid-cols-6 gap-2">
              {getFilteredEmojis().map((emoji, idx) => (
                <button
                  key={`${emoji.emoji}-${idx}`}
                  onClick={() => handleSelectEmoji(emoji)}
                  className={`flex items-center justify-center p-3 rounded-xl text-2xl transition-all hover:bg-white/10 ${
                    currentIcon === emoji.emoji && !currentIconCatalogId ? 'ring-2 ring-teal-500 bg-teal-500/10' : ''
                  }`}
                  title={emoji.keywords?.join(', ')}
                >
                  {emoji.emoji}
                </button>
              ))}
              {getFilteredEmojis().length === 0 && (
                <div className="col-span-6 py-8 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    No se encontraron emojis
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Upload tab */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Upload button */}
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                  isUploading ? 'opacity-50 cursor-wait' : 'hover:bg-white/5 hover:border-teal-500/50'
                }`}
                style={{ borderColor: 'var(--border-color)' }}
              >
                {isUploading ? (
                  <svg width={32} height={32} className="animate-spin text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg width={32} height={32} fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                )}
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {isUploading ? 'Subiendo...' : 'Click para subir imagen'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    PNG, JPG, GIF, WebP o SVG (max. 2MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Previously uploaded icons */}
              {uploadedIcons.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
                    Íconos subidos anteriormente
                  </p>
                  <div className="grid grid-cols-5 gap-3">
                    {uploadedIcons.map(icon => (
                      <div
                        key={icon.path}
                        className={`relative group rounded-xl overflow-hidden transition-all ${
                          currentIcon === icon.url ? 'ring-2 ring-teal-500' : ''
                        }`}
                      >
                        <button
                          onClick={() => handleSelectUploaded(icon)}
                          className="w-full aspect-square p-2 hover:bg-white/10"
                        >
                          <img
                            src={icon.url}
                            alt="Uploaded icon"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </button>
                        <button
                          onClick={(e) => handleDeleteIcon(icon.path, e)}
                          className="absolute top-1 right-1 p-1 rounded bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg width={12} height={12} fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loadingUploaded && (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                </div>
              )}

              {!loadingUploaded && uploadedIcons.length === 0 && (
                <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>
                  No tenés íconos subidos
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer: clear icon */}
        {hasCurrentIcon && (
          <div
            className="px-5 py-3"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            <button
              onClick={handleClear}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Quitar ícono
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, iconPath: null })}
        onConfirm={confirmDeleteIcon}
        title="Eliminar ícono"
        message="¿Estás seguro de que querés eliminar este ícono? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
