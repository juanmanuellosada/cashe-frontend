"use client"

import * as React from "react"
import { useEffect } from "react"

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    // Cargar el tema guardado desde localStorage al inicializar
    const savedTheme = localStorage.getItem("cashe-theme") || "light"
    document.documentElement.classList.toggle("dark", savedTheme === "dark")
  }, [])

  return <>{children}</>
}
