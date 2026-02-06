import { useZoom } from '../contexts/ZoomContext';

function ZoomControls({ compact = false }) {
  const { zoom, zoomIn, zoomOut, resetZoom, zoomPercent, canZoomIn, canZoomOut, isDefaultZoom } = useZoom();

  if (compact) {
    // Versión compacta para mobile
    return (
      <div
        className="flex items-center gap-0.5 p-0.5 rounded-lg"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <button
          onClick={zoomOut}
          disabled={!canZoomOut}
          className="p-1.5 rounded-md transition-colors duration-150 disabled:opacity-30"
          style={{ color: 'var(--text-secondary)' }}
          title="Reducir zoom"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={resetZoom}
          className="px-1.5 py-1 min-w-[40px] text-xs font-medium rounded-md transition-colors duration-150 hover:bg-[var(--bg-elevated)]"
          style={{ color: isDefaultZoom ? 'var(--text-muted)' : 'var(--accent-primary)' }}
          title="Restablecer zoom"
        >
          {zoomPercent}%
        </button>
        <button
          onClick={zoomIn}
          disabled={!canZoomIn}
          className="p-1.5 rounded-md transition-colors duration-150 disabled:opacity-30"
          style={{ color: 'var(--text-secondary)' }}
          title="Aumentar zoom"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    );
  }

  // Versión desktop
  return (
    <div
      className="flex items-center gap-1 px-1 py-0.5 rounded-lg"
      style={{
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      <button
        onClick={zoomOut}
        disabled={!canZoomOut}
        className="p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--bg-elevated)] disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ color: 'var(--text-secondary)' }}
        title="Reducir zoom (Ctrl+-)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
        </svg>
      </button>
      <button
        onClick={resetZoom}
        className="px-2 py-1 min-w-[50px] text-xs font-medium rounded-md transition-colors duration-150 hover:bg-[var(--bg-elevated)]"
        style={{ color: isDefaultZoom ? 'var(--text-muted)' : 'var(--accent-primary)' }}
        title="Restablecer zoom al 100%"
      >
        {zoomPercent}%
      </button>
      <button
        onClick={zoomIn}
        disabled={!canZoomIn}
        className="p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--bg-elevated)] disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ color: 'var(--text-secondary)' }}
        title="Aumentar zoom (Ctrl++)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
        </svg>
      </button>
    </div>
  );
}

export default ZoomControls;
