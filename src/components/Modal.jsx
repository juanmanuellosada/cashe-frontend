import { useState, useRef, useEffect } from 'react';

/**
 * Modal component with drag-to-dismiss on mobile
 * - Appears from top on mobile, centered on desktop
 * - Drag down to dismiss on mobile
 * - Click backdrop to close
 */
function Modal({
  isOpen,
  onClose,
  children,
  title,
  maxWidth = 'max-w-md',
  showCloseButton = true,
  closeOnBackdrop = true,
  zIndex = 50,
  loading = false,
}) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const modalRef = useRef(null);

  // Reset drag state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, loading, onClose]);

  // Handle touch start
  const handleTouchStart = (e) => {
    // Only allow drag from the header area or drag indicator
    if (e.target.closest('[data-modal-header]') || e.target.closest('[data-drag-handle]')) {
      startY.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  // Handle touch move
  const handleTouchMove = (e) => {
    if (!isDragging) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    // Only allow dragging down (positive diff)
    if (diff > 0) {
      setDragY(diff);
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isDragging) return;

    // If dragged more than 100px, close the modal
    if (dragY > 100 && !loading) {
      onClose();
    }

    // Reset
    setDragY(0);
    setIsDragging(false);
  };

  if (!isOpen) return null;

  // Calculate opacity based on drag distance
  const backdropOpacity = Math.max(0.6 - (dragY / 300), 0);
  const shouldClose = dragY > 100;

  return (
    <div className={`fixed inset-0 z-[${zIndex}] flex items-start sm:items-center justify-center`} style={{ zIndex }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
        onClick={closeOnBackdrop && !loading ? onClose : undefined}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`relative w-full ${maxWidth} sm:m-4 mt-0 sm:mt-0 rounded-b-2xl sm:rounded-2xl flex flex-col animate-slide-down`}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          maxHeight: 'min(calc(100dvh - 40px), calc(100vh - 40px))',
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
        {title && (
          <div
            className="flex items-center justify-between px-4 py-2 sm:py-3 flex-shrink-0 border-b cursor-grab active:cursor-grabbing sm:cursor-default"
            style={{ borderColor: 'var(--border-subtle)' }}
            data-modal-header
          >
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                disabled={loading}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {children}
      </div>
    </div>
  );
}

export default Modal;
