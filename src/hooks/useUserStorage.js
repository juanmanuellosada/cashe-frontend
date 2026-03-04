import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * localStorage hook that namespaces keys by user ID.
 * Prevents data leaks between users on shared devices.
 *
 * For keys that don't need user namespacing (e.g. darkMode, zoom),
 * use regular localStorage directly.
 *
 * @param {string} baseKey - The base storage key (will be prefixed with user ID)
 * @param {*} defaultValue - Default value if nothing stored
 * @returns {[value, setValue]} - Stateful value and setter
 */
export function useUserStorage(baseKey, defaultValue) {
  const { user } = useAuth();
  const userId = user?.id;

  const getKey = useCallback(() => {
    return userId ? `${baseKey}_${userId}` : null;
  }, [baseKey, userId]);

  const [value, setValue] = useState(() => {
    if (!userId) return defaultValue;
    try {
      const saved = localStorage.getItem(`${baseKey}_${userId}`);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  // Re-read when user changes (e.g. login)
  useEffect(() => {
    const key = getKey();
    if (!key) return;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setValue(JSON.parse(saved));
      } else {
        setValue(defaultValue);
      }
    } catch {
      setValue(defaultValue);
    }
  }, [getKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist on change
  useEffect(() => {
    const key = getKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota errors
    }
  }, [value, getKey]);

  return [value, setValue];
}

/**
 * Clear all user-scoped localStorage keys on logout.
 * Call this from the signOut function.
 */
export function clearUserStorage(userId) {
  if (!userId) return;
  const suffix = `_${userId}`;
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.endsWith(suffix)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}
