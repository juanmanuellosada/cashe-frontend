// Simple event emitter for data change notifications
// Components can subscribe to these events to know when to refetch data

const listeners = new Map();

export const DataEvents = {
  EXPENSES_CHANGED: 'expenses_changed',
  INCOMES_CHANGED: 'incomes_changed',
  TRANSFERS_CHANGED: 'transfers_changed',
  ACCOUNTS_CHANGED: 'accounts_changed',
  CATEGORIES_CHANGED: 'categories_changed',
  BUDGETS_CHANGED: 'budgets_changed',
  GOALS_CHANGED: 'goals_changed',
  RECURRING_CHANGED: 'recurring_changed',
  SCHEDULED_CHANGED: 'scheduled_changed',
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
  // Emit specific event listeners
  listeners.get(event)?.forEach(callback => callback());

  // Always notify ALL_DATA_CHANGED listeners (but don't cascade back to specific events)
  if (event !== DataEvents.ALL_DATA_CHANGED) {
    listeners.get(DataEvents.ALL_DATA_CHANGED)?.forEach(callback => callback());
  }
};

// Surgical variant: only notify specific-event subscribers, do NOT cascade to
// ALL_DATA_CHANGED. Used for internal cache-refresh signals where we want the
// affected component to pick up new data without triggering a full dashboard
// refetch on every unrelated subscriber.
export const emitQuiet = (event) => {
  listeners.get(event)?.forEach(callback => callback());
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

  // Stabilize the events array so inline arrays don't cause re-subscriptions
  const eventsKey = Array.isArray(events) ? events.join(',') : events;

  useEffect(() => {
    const eventList = eventsKey.split(',').filter(Boolean);
    const unsubscribes = eventList.map(event =>
      subscribe(event, () => callbackRef.current())
    );

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [eventsKey]);
};
