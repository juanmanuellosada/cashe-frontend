/**
 * useHaptics - Hook for haptic feedback using the Vibration API
 * Provides tactile confirmation for touch interactions on supported devices
 */

const isSupported = () => 'vibrate' in navigator;

// Vibration patterns (in milliseconds)
const patterns = {
  light: [10],
  medium: [20],
  heavy: [30],
  success: [10, 50, 10],
  error: [50, 100, 50],
  warning: [30, 50, 30],
  selection: [5],
  impact: [15],
};

export function useHaptics() {
  const vibrate = (pattern) => {
    if (!isSupported()) return false;
    try {
      return navigator.vibrate(pattern);
    } catch (e) {
      return false;
    }
  };

  return {
    // Check if haptics are supported
    isSupported: isSupported(),

    // Light tap feedback - for subtle interactions
    light: () => vibrate(patterns.light),

    // Medium tap feedback - for standard button presses
    medium: () => vibrate(patterns.medium),

    // Heavy tap feedback - for significant actions
    heavy: () => vibrate(patterns.heavy),

    // Success pattern - for completed actions
    success: () => vibrate(patterns.success),

    // Error pattern - for failed actions
    error: () => vibrate(patterns.error),

    // Warning pattern - for destructive actions
    warning: () => vibrate(patterns.warning),

    // Selection feedback - for selecting items
    selection: () => vibrate(patterns.selection),

    // Impact feedback - for swipe reveals, etc.
    impact: () => vibrate(patterns.impact),

    // Custom vibration pattern
    custom: (pattern) => vibrate(pattern),

    // Stop any ongoing vibration
    stop: () => {
      if (!isSupported()) return;
      navigator.vibrate(0);
    },
  };
}

export default useHaptics;
