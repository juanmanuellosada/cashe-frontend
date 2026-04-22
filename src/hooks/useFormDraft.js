import { useState, useEffect, useCallback, useRef } from 'react';

// Keys used for in-progress movement drafts. Exported so signOut and the
// post-submit cleanup can wipe them all without each form having to re-derive
// its own key.
export const MOVEMENT_DRAFT_KEYS = [
  'cashe_draft_movement_type',
  'cashe_draft_shared_amount',
  'cashe_draft_expense',
  'cashe_draft_income',
  'cashe_draft_transfer',
];

export function clearMovementDrafts() {
  if (typeof window === 'undefined') return;
  try {
    MOVEMENT_DRAFT_KEYS.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // sessionStorage disabled — nothing to do
  }
}

/**
 * useFormDraft — like useState, but persists to sessionStorage.
 *
 * Purpose: the new-movement modal can get torn down mid-edit (Chrome's tab
 * discarding on background tabs, PWA service-worker updates, hot reloads),
 * and plain useState loses everything typed so far. Persisting to
 * sessionStorage lets the form pick up where the user left off.
 *
 * Pass `key = null` (or falsy) to opt out — useful when the form is
 * pre-filled with real data (e.g. duplicating a movement) and we don't want
 * the stale draft to override the explicit prefill.
 */
export function useFormDraft(key, initialValue) {
  const initialRef = useRef(initialValue);

  const [state, setState] = useState(() => {
    if (!key || typeof window === 'undefined') return initialValue;
    try {
      const stored = sessionStorage.getItem(key);
      if (!stored) return initialValue;
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && typeof initialValue === 'object' && initialValue) {
        return { ...initialValue, ...parsed };
      }
      return parsed ?? initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (!key || typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // quota exceeded or storage disabled — silently skip
    }
  }, [key, state]);

  const clear = useCallback(() => {
    if (!key || typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(key);
    } catch {}
    setState(initialRef.current);
  }, [key]);

  return [state, setState, clear];
}
