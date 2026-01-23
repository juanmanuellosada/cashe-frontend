import { useEffect } from 'react';

function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const styles = {
    success: {
      bg: 'rgba(0, 217, 154, 0.12)',
      border: 'rgba(0, 217, 154, 0.25)',
      color: 'var(--accent-green)',
      glow: 'rgba(0, 217, 154, 0.2)',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      bg: 'rgba(255, 92, 114, 0.12)',
      border: 'rgba(255, 92, 114, 0.25)',
      color: 'var(--accent-red)',
      glow: 'rgba(255, 92, 114, 0.2)',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    info: {
      bg: 'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.25)',
      color: 'var(--accent-blue)',
      glow: 'rgba(59, 130, 246, 0.2)',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.25)',
      color: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.2)',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  };

  const currentStyle = styles[type] || styles.info;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] animate-bounce-in pointer-events-none">
      <div
        className="flex items-center gap-3 px-4 py-4 rounded-2xl backdrop-blur-xl max-w-md mx-auto pointer-events-auto relative overflow-hidden"
        style={{
          backgroundColor: currentStyle.bg,
          border: `1px solid ${currentStyle.border}`,
          boxShadow: `0 8px 32px ${currentStyle.glow}, 0 4px 12px rgba(0,0,0,0.2)`,
        }}
      >
        {/* Icon with circle background */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ 
            backgroundColor: currentStyle.bg,
            border: `1px solid ${currentStyle.border}`,
            color: currentStyle.color 
          }}
        >
          {currentStyle.icon}
        </div>

        {/* Message */}
        <p
          className="flex-1 text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {message}
        </p>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-white/10 active:scale-95"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Progress bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden"
          style={{ backgroundColor: 'transparent' }}
        >
          <div
            className="h-full"
            style={{
              backgroundColor: currentStyle.color,
              animation: `shrink ${duration}ms linear forwards`,
              opacity: 0.6
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

export default Toast;
