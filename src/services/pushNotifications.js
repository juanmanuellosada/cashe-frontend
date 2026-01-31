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

// Subscribe to push notifications
export const subscribeToPush = async (vapidPublicKey) => {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported');
  }

  // Request permission first
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  // Get service worker registration with retry
  let registration;
  let retries = 3;
  while (retries > 0) {
    try {
      registration = await navigator.serviceWorker.ready;
      // Wait a bit for the SW to fully activate
      await new Promise(resolve => setTimeout(resolve, 500));
      break;
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Check if already subscribed
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    // Convert VAPID key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // Subscribe with retry
    retries = 3;
    while (retries > 0) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
        break;
      } catch (err) {
        console.warn('Push subscription attempt failed:', err.message);
        retries--;
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // Save subscription to database
  await savePushSubscription(subscription);

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
    // Add timeout to prevent hanging if SW is not ready
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SW timeout')), 5000)
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
    return { supported: false, subscribed: false };
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
