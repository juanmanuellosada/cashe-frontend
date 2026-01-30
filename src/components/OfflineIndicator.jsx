import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * OfflineIndicator - Shows when user is offline or just came back online
 * Should be placed in the Layout component
 */
function OfflineIndicator() {
  const { isOffline, wasOffline } = useOnlineStatus();

  // Show nothing if online and wasn't recently offline
  if (!isOffline && !wasOffline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center py-2 px-4 animate-slide-down"
      style={{
        backgroundColor: isOffline ? 'var(--accent-red)' : 'var(--accent-green)',
        color: 'white',
      }}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {isOffline ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
            <span>Sin conexión - Viendo datos guardados</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
            <span>Conexión restaurada</span>
          </>
        )}
      </div>

      <style>{`
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default OfflineIndicator;
