"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar"
import { MobileNavbar } from "@/components/mobile-navbar"
import { AppHeader } from "@/components/app-header"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { LayoutDashboard, Receipt, CreditCard, Wallet, ArrowRightLeft, PieChart, Settings, LogOut } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function AppLayout(
  { children, spreadsheetId, accessToken }: { children: React.ReactNode; spreadsheetId?: string; accessToken?: string }
) {
  const isMobile = useIsMobile()
  const { toast } = useToast()
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const handleOnlineStatus = () => {
      setIsOffline(!navigator.onLine)
      if (!navigator.onLine) {
        toast({
          title: "Sin conexión",
          description:
            "Estás trabajando en modo sin conexión. Los cambios se sincronizarán cuando vuelvas a estar en línea.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Conectado",
          description: "Estás de vuelta en línea. Sincronizando datos...",
        })
      }
    }

    window.addEventListener("online", handleOnlineStatus)
    window.addEventListener("offline", handleOnlineStatus)
    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener("online", handleOnlineStatus)
      window.removeEventListener("offline", handleOnlineStatus)
    }
  }, [toast])

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="flex justify-center">
            <Image src="/images/logo.png" alt="Cashé Logo" width={150} height={150} priority />
          </div>
          <h1 className="text-3xl font-bold">Bienvenido a Cashé</h1>
          <p className="text-muted-foreground">Gestiona tus finanzas personales de forma simple y segura</p>
          <Button size="lg" className="w-full" onClick={() => setIsAuthenticated(true)}>
            Iniciar sesión con Google
          </Button>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      {isMobile ? (
        <>
          <div className="flex min-h-screen flex-col">
            <AppHeader isOffline={isOffline} spreadsheetId={spreadsheetId} accessToken={accessToken} />
            <main className="flex-1 p-4 pb-16">{children}</main>
            <MobileNavbar />
          </div>
        </>
      ) : (
        <>
          <Sidebar variant="inset" collapsible="icon">
            <SidebarHeader className="flex items-center justify-center py-4">
              <Image
                src="/images/logo.png"
                alt="Cashé Logo"
                width={128}
                height={128}
                className="transition-all duration-200"
              />
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Principal</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive tooltip="Dashboard">
                        <Link href="/">
                          <LayoutDashboard />
                          <span>Dashboard</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Finanzas">
                        <Link href="/finanzas">
                          <Receipt />
                          <span>Finanzas</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Cuentas">
                        <Link href="/cuentas">
                          <Wallet />
                          <span>Cuentas</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Tarjetas">
                        <Link href="/tarjetas">
                          <CreditCard />
                          <span>Tarjetas</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Transferencias">
                        <Link href="/transferencias">
                          <ArrowRightLeft />
                          <span>Transferencias</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Análisis">
                        <Link href="/analisis">
                          <PieChart />
                          <span>Análisis</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Configuración</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Ajustes">
                        <Link href="/ajustes">
                          <Settings />
                          <span>Ajustes</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <span className="truncate">Usuario</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <div className="flex min-h-screen flex-col">
              <AppHeader isOffline={isOffline} spreadsheetId={spreadsheetId} accessToken={accessToken} />
              <main className="flex-1 p-6">{children}</main>
            </div>
          </SidebarInset>
        </>
      )}
    </SidebarProvider>
  )
}
