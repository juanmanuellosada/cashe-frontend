// Simple event emitter for data change notifications
// Components can subscribe to these events to know when to refetch data

const listeners = new Map();

export const DataEvents = {
  EXPENSES_CHANGED: 'expenses_changed',
  INCOMES_CHANGED: 'incomes_changed',
  TRANSFERS_CHANGED: 'transfers_changed',
  ACCOUNTS_CHANGED: 'accounts_changed',
  CATEGORIES_CHANGED: 'categories_changed',
  RULES_CHANGED: 'rules_changed',
  ALL_DATA_CHANGED: 'all_data_changed',
};

export const subscribe = (event, callback) => {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(callback);

  // Return unsubscribe function
  return () => {
    listeners.get(event)?.delete(callback);
  };
};

export const emit = (event) => {
  // Emit specific event
  listeners.get(event)?.forEach(callback => callback());

  // If emitting ALL_DATA_CHANGED, also notify all specific event listeners
  if (event === DataEvents.ALL_DATA_CHANGED) {
    Object.values(DataEvents).forEach(specificEvent => {
      if (specificEvent !== DataEvents.ALL_DATA_CHANGED) {
        listeners.get(specificEvent)?.forEach(callback => callback());
      }
    });
  } else {
    // Also emit ALL_DATA_CHANGED for components that want to listen to everything
    listeners.get(DataEvents.ALL_DATA_CHANGED)?.forEach(callback => callback());
  }
};

// Clear all listeners (useful on logout)
export const clear = () => {
  listeners.clear();
};

// Hook for easy subscription in components
import { useEffect, useCallback, useRef } from 'react';

export const useDataEvent = (events, callback) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const eventList = Array.isArray(events) ? events : [events];
    const unsubscribes = eventList.map(event =>
      subscribe(event, () => callbackRef.current())
    );

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [events]);
};
