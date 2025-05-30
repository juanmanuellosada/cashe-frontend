"use client";

import React, { createContext, useState, useContext, ReactNode } from 'react';

interface RefreshContextType {
  globalRefreshKey: number;
  triggerGlobalRefresh: () => void;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export const RefreshProvider = ({ children }: { children: ReactNode }) => {
  const [globalRefreshKey, setGlobalRefreshKey] = useState(0);

  const triggerGlobalRefresh = () => {
    setGlobalRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <RefreshContext.Provider value={{ globalRefreshKey, triggerGlobalRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
}; 