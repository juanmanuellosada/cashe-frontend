"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { RefreshProvider } from "@/contexts/RefreshContext";
import { GoogleApiProvider } from "@/hooks/useGoogleApi";
// import { Toaster } from "@/components/ui/toaster"; // Se comenta Toaster para evitar posibles conflictos si no está envuelto aquí también
import "../i18n"; // Importar para inicializar i18next

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <GoogleApiProvider>
          <RefreshProvider>
            {children}
            {/* <Toaster /> Si se decide que Toaster debe estar aquí, descomentar y asegurarse que esté dentro de un provider si es necesario */}
          </RefreshProvider>
        </GoogleApiProvider>
      </SessionProvider>
    </ThemeProvider>
  );
} 