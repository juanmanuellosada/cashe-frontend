import { createContext, useContext, useState, useCallback } from 'react';

const ErrorContext = createContext({});

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

export const ErrorProvider = ({ children }) => {
  const [error, setError] = useState(null);

  const showError = useCallback((message, details = null) => {
    setError({
      message: typeof message === 'string' ? message : message?.message || 'Ha ocurrido un error',
      details: details || (typeof message === 'object' ? JSON.stringify(message, null, 2) : null),
      timestamp: new Date().toISOString()
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <ErrorContext.Provider value={{ error, showError, clearError }}>
      {children}
    </ErrorContext.Provider>
  );
};
