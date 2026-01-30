import { useState, useRef, useCallback } from 'react';
import { useHaptics } from '../hooks/useHaptics';

/**
 * SwipeableItem - Swipe-to-reveal actions component
 * Wraps list items to enable swipe gestures for actions like delete
 */
function SwipeableItem({
  children,
  onDelete,
  onEdit,
  disabled = false,
  deleteLabel = 'Eliminar',
  editLabel = 'Editar',
  threshold = 80, // Swipe distance to trigger action
}) {
  const [translateX, setTranslateX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);

  const containerRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const haptics = useHaptics();
  const hasTriggeredHaptic = useRef(false);
  const isHorizontalSwipe = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (disabled) return;

    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = startX.current;
    hasTriggeredHaptic.current = false;
    isHorizontalSwipe.current = null;

    // If already revealed, allow closing
    if (isRevealed) {
      setIsSwiping(true);
    }
  }, [disabled, isRevealed]);

  const handleTouchMove = useCallback((e) => {
    if (disabled) return;
    if (startX.current === 0) return;

    const diffX = e.touches[0].clientX - startX.current;
    const diffY = e.touches[0].clientY - startY.current;

    // Determine if this is a horizontal or vertical swipe
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    // Only handle horizontal swipes
    if (!isHorizontalSwipe.current) return;

    setIsSwiping(true);
    currentX.current = e.touches[0].clientX;

    let newTranslateX;

    if (isRevealed) {
      // When revealed, allow swiping back to close
      newTranslateX = Math.min(0, Math.max(-threshold, -threshold + diffX));
    } else {
      // Only allow left swipe (negative values)
      newTranslateX = Math.min(0, Math.max(-threshold * 1.5, diffX));
    }

    setTranslateX(newTranslateX);

    // Haptic feedback when reaching threshold
    if (Math.abs(newTranslateX) >= threshold && !hasTriggeredHaptic.current) {
      haptics.impact();
      hasTriggeredHaptic.current = true;
    }

    // Prevent vertical scroll while swiping horizontally
    if (Math.abs(diffX) > 10) {
      e.preventDefault();
    }
  }, [disabled, threshold, haptics, isRevealed]);

  const handleTouchEnd = useCallback(() => {
    if (disabled) return;

    startX.current = 0;
    startY.current = 0;
    isHorizontalSwipe.current = null;
    setIsSwiping(false);

    // Determine final state based on swipe distance
    if (Math.abs(translateX) >= threshold * 0.5) {
      // Reveal actions
      setTranslateX(-threshold);
      setIsRevealed(true);
      haptics.selection();
    } else {
      // Close actions
      setTranslateX(0);
      setIsRevealed(false);
    }
  }, [disabled, translateX, threshold, haptics]);

  const handleDelete = useCallback(() => {
    haptics.warning();
    setTranslateX(0);
    setIsRevealed(false);
    onDelete?.();
  }, [haptics, onDelete]);

  const handleEdit = useCallback(() => {
    haptics.light();
    setTranslateX(0);
    setIsRevealed(false);
    onEdit?.();
  }, [haptics, onEdit]);

  const closeActions = useCallback(() => {
    setTranslateX(0);
    setIsRevealed(false);
  }, []);

  // Calculate action button visibility
  const actionOpacity = Math.min(1, Math.abs(translateX) / (threshold * 0.5));
  const showActions = Math.abs(translateX) > 10;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{ touchAction: isSwiping ? 'none' : 'pan-y' }}
    >
      {/* Background actions */}
      <div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{
          opacity: actionOpacity,
          pointerEvents: showActions ? 'auto' : 'none',
        }}
      >
        {onEdit && (
          <button
            onClick={handleEdit}
            className="flex items-center justify-center px-4 transition-colors"
            style={{
              backgroundColor: 'var(--accent-blue)',
              color: 'white',
              minWidth: threshold / 2,
            }}
          >
            <div className="flex flex-col items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-xs font-medium">{editLabel}</span>
            </div>
          </button>
        )}
        {onDelete && (
          <button
            onClick={handleDelete}
            className="flex items-center justify-center px-4 transition-colors"
            style={{
              backgroundColor: 'var(--accent-red)',
              color: 'white',
              minWidth: onEdit ? threshold / 2 : threshold,
            }}
          >
            <div className="flex flex-col items-center gap-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-xs font-medium">{deleteLabel}</span>
            </div>
          </button>
        )}
      </div>

      {/* Foreground content */}
      <div
        className="relative bg-inherit"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
          backgroundColor: 'var(--bg-secondary)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={isRevealed ? closeActions : undefined}
      >
        {children}
      </div>
    </div>
  );
}

export default SwipeableItem;
