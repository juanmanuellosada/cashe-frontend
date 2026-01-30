import { useState, useRef, useCallback, useEffect } from 'react';
import { useHaptics } from '../hooks/useHaptics';

/**
 * PullToRefresh - Native-feeling pull-to-refresh component
 * Wraps content and triggers refresh callback on pull down gesture
 */
function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  threshold = 80, // Pull distance to trigger refresh
  maxPull = 120, // Maximum pull distance
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const containerRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const haptics = useHaptics();
  const hasTriggeredHaptic = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (disabled || isRefreshing) return;

    // Only allow pull when scrolled to top
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    currentY.current = startY.current;
    hasTriggeredHaptic.current = false;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e) => {
    if (disabled || isRefreshing) return;
    if (startY.current === 0) return;

    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setPullDistance(0);
      setIsPulling(false);
      return;
    }

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 0) {
      // Apply resistance to pull
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, maxPull);
      setPullDistance(distance);
      setIsPulling(true);

      // Haptic feedback when reaching threshold
      if (distance >= threshold && !hasTriggeredHaptic.current) {
        haptics.medium();
        hasTriggeredHaptic.current = true;
      }

      // Prevent default scroll behavior when pulling
      if (diff > 10) {
        e.preventDefault();
      }
    }
  }, [disabled, isRefreshing, threshold, maxPull, haptics]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    startY.current = 0;
    setIsPulling(false);

    if (pullDistance >= threshold && onRefresh) {
      setIsRefreshing(true);
      haptics.success();

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
        haptics.error();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, pullDistance, threshold, onRefresh, haptics]);

  // Reset pull distance when refreshing completes
  useEffect(() => {
    if (!isRefreshing) {
      setPullDistance(0);
    }
  }, [isRefreshing]);

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto"
      style={{
        height: '100%',
        touchAction: isPulling ? 'none' : 'pan-y',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center transition-all duration-200 overflow-hidden pointer-events-none z-10"
        style={{
          top: 0,
          height: showIndicator ? Math.max(pullDistance, isRefreshing ? 50 : 0) : 0,
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            transform: `translateY(${Math.max(0, (pullDistance || (isRefreshing ? 50 : 0)) - 40)}px)`,
          }}
        >
          {isRefreshing ? (
            // Spinning loader
            <div
              className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{
                borderColor: 'var(--border-subtle)',
                borderTopColor: 'var(--accent-primary)',
              }}
            />
          ) : (
            // Arrow indicator
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                backgroundColor: progress >= 1 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                transform: `rotate(${progress >= 1 ? 180 : 0}deg)`,
              }}
            >
              <svg
                className="w-4 h-4 transition-colors duration-200"
                style={{ color: progress >= 1 ? 'white' : 'var(--text-secondary)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default PullToRefresh;
