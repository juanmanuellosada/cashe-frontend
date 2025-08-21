import type React from "react"
import type { Metadata } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { CurrencyProvider } from "@/contexts/currency-context"
import { CurrenciesProvider } from "@/contexts/currencies-context"
import { CategoriesProvider } from "@/contexts/categories-context"
import { AccountsProvider } from "@/contexts/accounts-context"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = {
  title: "Cashé - Gestión Financiera Personal",
  description: "Administra tus finanzas personales de manera inteligente con Cashé",
  generator: "v0.app",
  icons: {
    icon: "/cashe-logo.png",
    shortcut: "/cashe-logo.png",
    apple: "/cashe-logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <CurrenciesProvider>
            <CurrencyProvider>
              <AccountsProvider>
                <CategoriesProvider>
                  {children}
                  <Toaster />
                </CategoriesProvider>
              </AccountsProvider>
            </CurrencyProvider>
          </CurrenciesProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
