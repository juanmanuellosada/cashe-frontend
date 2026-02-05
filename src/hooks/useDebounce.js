import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores
 * Útil para evitar llamadas excesivas a APIs mientras el usuario escribe
 *
 * @param {any} value - El valor a debouncear
 * @param {number} delay - Delay en milisegundos (default: 300ms)
 * @returns {any} - El valor debounceado
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
