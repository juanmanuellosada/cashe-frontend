"use client"

import React, { ReactNode } from "react"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/components/theme-provider"
import { ToastProvider, ToastViewport } from "@/components/ui/toast"
import { I18nextProvider } from "react-i18next"
import i18n from "../i18n"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <ToastProvider>
          <I18nextProvider i18n={i18n}>
            {children}
          </I18nextProvider>
          <ToastViewport />
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}