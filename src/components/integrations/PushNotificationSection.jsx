import { useState, useEffect } from 'react';
import {
  isPushSupported,
  getNotificationPermission,
  getPushSubscriptionStatus,
  subscribeToPush,
  unsubscribeFromPush,
  showLocalNotification,
} from '../../services/pushNotifications';

// VAPID public key (public keys are safe to hardcode)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BGAtLxt4YDMsBi4kHWTDoGusF-x1-qGY3YF6TqYzr_JOMbcVUJ2sh9cjOMHty3v6_B5F5QabzpMmFqPDjSGQRCU';

function PushNotificationSection() {
  const [status, setStatus] = useState({
    supported: false,
    subscribed: false,
    permission: 'default',
    loading: true,
  });
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const pushStatus = await getPushSubscriptionStatus();
      setStatus({
        ...pushStatus,
        loading: false,
      });
    } catch (err) {
      console.error('Error checking push status:', err);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSubscribe = async () => {
    if (!VAPID_PUBLIC_KEY) {
      setError('Las notificaciones push no están configuradas');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      await subscribeToPush(VAPID_PUBLIC_KEY);
      await checkStatus();

      // Show a test notification
      await showLocalNotification('Notificaciones activadas', {
        body: 'Recibirás alertas de transacciones programadas',
        tag: 'subscription-success',
      });
    } catch (err) {
      console.error('Error subscribing:', err);
      setError(err.message || 'No se pudieron activar las notificaciones');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setActionLoading(true);
    setError(null);

    try {
      await unsubscribeFromPush();
      await checkStatus();
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError(err.message || 'No se pudieron desactivar las notificaciones');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await showLocalNotification('Notificación de prueba', {
        body: 'Las notificaciones funcionan correctamente',
        tag: 'test-notification',
      });
    } catch (err) {
      setError('No se pudo enviar la notificación de prueba');
    }
  };

  // Check if iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;

  // Not supported
  if (!status.supported && !status.loading) {
    return (
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Notificaciones Push
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {isIOS && !isStandalone
                ? 'Para activar notificaciones en iOS, instalá la app: Compartir → Agregar a pantalla de inicio'
                : 'Tu navegador no soporta notificaciones push'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Permission denied
  if (status.permission === 'denied') {
    return (
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--accent-red-dim)' }}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--accent-red)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Notificaciones Push
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Las notificaciones están bloqueadas. Para activarlas, debes cambiar los permisos en la configuración de tu navegador.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: status.subscribed ? 'var(--accent-green-dim)' : 'var(--accent-primary-dim)',
          }}
        >
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: status.subscribed ? 'var(--accent-green)' : 'var(--accent-primary)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Notificaciones Push
            </h3>
            {status.subscribed && (
              <span
                className="px-2 py-1 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'var(--accent-green-dim)', color: 'var(--accent-green)' }}
              >
                Activadas
              </span>
            )}
          </div>

          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {status.subscribed
              ? 'Recibirás notificaciones cuando tengas transacciones programadas pendientes de aprobación.'
              : 'Activa las notificaciones para recibir alertas de transacciones programadas.'}
          </p>

          {/* Error message */}
          {error && (
            <p className="text-sm mt-2" style={{ color: 'var(--accent-red)' }}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {status.subscribed ? (
              <>
                <button
                  onClick={handleTestNotification}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  Probar
                </button>
                <button
                  onClick={handleUnsubscribe}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent-red-dim)', color: 'var(--accent-red)' }}
                >
                  {actionLoading ? 'Desactivando...' : 'Desactivar'}
                </button>
              </>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={actionLoading || status.loading}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
              >
                {actionLoading ? 'Activando...' : 'Activar notificaciones'}
              </button>
            )}
          </div>

          {/* Info note */}
          {!status.subscribed && (
            <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
              Se te pedirá permiso para enviar notificaciones. Puedes desactivarlas en cualquier momento.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PushNotificationSection;
