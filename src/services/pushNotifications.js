import { supabase } from '../config/supabase';

// Check if push notifications are supported
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

// Get current notification permission status
export const getNotificationPermission = () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'granted', 'denied', or 'default'
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  const permission = await Notification.requestPermission();
  return permission;
};

// Helper to add timeout to a promise
const withTimeout = (promise, ms, errorMessage) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
};

// Check if we're in development mode
const isDevelopment = () => {
  return import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

// Subscribe to push notifications
export const subscribeToPush = async (vapidPublicKey) => {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported');
  }

  // Check if SW is available (not in dev mode without SW)
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) {
    if (isDevelopment()) {
      throw new Error('Las notificaciones push no funcionan en modo desarrollo. Probá con el build de producción (npm run build && npm run preview).');
    }
    throw new Error('Service Worker no está registrado. Recargá la página e intentá de nuevo.');
  }

  // Request permission first (with timeout)
  const permission = await withTimeout(
    requestNotificationPermission(),
    30000,
    'El navegador no respondió a la solicitud de permisos'
  );

  if (permission !== 'granted') {
    throw new Error('Permiso de notificaciones denegado');
  }

  // Get service worker registration with timeout
  let registration;
  try {
    registration = await withTimeout(
      navigator.serviceWorker.ready,
      10000,
      'Service Worker no está disponible'
    );
    // Wait a bit for the SW to fully activate
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (err) {
    console.error('SW registration error:', err);
    if (isDevelopment()) {
      throw new Error('Las notificaciones push solo funcionan en producción');
    }
    throw new Error('No se pudo conectar con el Service Worker. Recargá la página.');
  }

  // Check if already subscribed
  let subscription;
  try {
    subscription = await withTimeout(
      registration.pushManager.getSubscription(),
      5000,
      'No se pudo verificar la suscripción existente'
    );
  } catch (err) {
    console.warn('Error checking existing subscription:', err);
    subscription = null;
  }

  if (!subscription) {
    // Convert VAPID key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // Subscribe with timeout - Brave may hang here
    try {
      subscription = await withTimeout(
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        }),
        15000,
        'El navegador no pudo completar la suscripción. Esto puede ocurrir en navegadores con bloqueo de rastreadores activo (como Brave). Probá desactivar Shields o usá Chrome/Firefox.'
      );
    } catch (err) {
      console.error('Push subscription error:', err);
      // Check for specific Brave/privacy-related errors
      if (err.message.includes('push service') || err.message.includes('Registration failed')) {
        throw new Error('Tu navegador bloqueó las notificaciones push. Si usás Brave, probá desactivar Shields para este sitio.');
      }
      throw err;
    }
  }

  // Save subscription to database
  try {
    await withTimeout(
      savePushSubscription(subscription),
      10000,
      'No se pudo guardar la suscripción en el servidor'
    );
  } catch (err) {
    console.error('Error saving subscription:', err);
    // Try to unsubscribe since we couldn't save
    try {
      await subscription.unsubscribe();
    } catch (e) {
      // Ignore
    }
    throw err;
  }

  return subscription;
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async () => {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    // Remove from database first
    await deletePushSubscription(subscription.endpoint);

    // Then unsubscribe
    await subscription.unsubscribe();
  }
};

// Save push subscription to Supabase
const savePushSubscription = async (subscription) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const subscriptionJson = subscription.toJSON();

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: user.id,
      endpoint: subscriptionJson.endpoint,
      p256dh: subscriptionJson.keys.p256dh,
      auth: subscriptionJson.keys.auth,
    }, {
      onConflict: 'user_id,endpoint',
    });

  if (error) throw error;
};

// Delete push subscription from Supabase
const deletePushSubscription = async (endpoint) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint);
};

// Get current subscription status
export const getPushSubscriptionStatus = async () => {
  if (!isPushSupported()) {
    return { supported: false, subscribed: false };
  }

  const permission = getNotificationPermission();
  if (permission === 'denied') {
    return { supported: true, subscribed: false, permission: 'denied' };
  }

  try {
    // Check if there's any SW registration first
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length === 0) {
      // No SW - if in dev mode, still show as supported but explain in error
      // In production, this means SW hasn't loaded yet
      return { supported: true, subscribed: false, permission, noSW: true };
    }

    // Try to get the ready SW with a longer timeout
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SW timeout')), 10000)
      )
    ]);
    const subscription = await registration.pushManager.getSubscription();

    return {
      supported: true,
      subscribed: !!subscription,
      permission,
    };
  } catch (err) {
    console.warn('Service worker not ready:', err);
    // Still return supported:true since the browser supports it
    return { supported: true, subscribed: false, permission };
  }
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Show a local notification (for testing)
export const showLocalNotification = async (title, options = {}) => {
  if (getNotificationPermission() !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    ...options,
  });
};
