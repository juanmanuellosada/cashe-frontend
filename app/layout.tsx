import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { AppProviders } from "@/components/AppProviders"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Cashé",
  description: "Tu app de gestión de finanzas personales",
  manifest: "/manifest.json",
  generator: 'v0.dev',
  icons: {
    icon: '/images/favicon.ico',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <AppProviders>
          {children}
        </AppProviders>
        <Toaster />
      </body>
    </html>
  )
}
