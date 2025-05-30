"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { findSheet, createSheet } from "@/lib/googleApi";

interface GoogleApiContextProps {
  accessToken: string | null;
  spreadsheetId: string | null;
  isLoading: boolean;
  error: string | null;
  refreshSheet: () => Promise<void>;
}

const GoogleApiContext = createContext<GoogleApiContextProps | undefined>(undefined);

export const GoogleApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeSheet = useCallback(async () => {
    if (session?.accessToken) {
      setIsLoading(true);
      setError(null);
      try {
        let sheetId = await findSheet(session.accessToken);
        if (!sheetId) {
          sheetId = await createSheet(session.accessToken);
        }
        setSpreadsheetId(sheetId);
      } catch (err: any) {
        if (err.message?.includes("Unauthorized")) {
          await signOut();
          signIn("google");
          return;
        }
        setError(err.message || "Error inicializando la hoja de cálculo");
      } finally {
        setIsLoading(false);
      }
    }
  }, [session]);

  useEffect(() => {
    if (status === "authenticated") {
      initializeSheet();
    }
  }, [status, initializeSheet]);

  return (
    <GoogleApiContext.Provider
      value={{
        accessToken: session?.accessToken || null,
        spreadsheetId,
        isLoading,
        error,
        refreshSheet: initializeSheet,
      }}
    >
      {children}
    </GoogleApiContext.Provider>
  );
};

export function useGoogleApi() {
  const context = useContext(GoogleApiContext);
  if (!context) {
    throw new Error("useGoogleApi debe usarse dentro de GoogleApiProvider");
  }
  return context;
} 