"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { motion } from "framer-motion"
import { CurrencySelector } from "@/components/currency-selector"
import {
  Menu,
  Home,
  TrendingUp,
  ArrowLeftRight,
  Settings,
  LogOut,
  PieChart,
  Wallet,
  Tag,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Cuentas", href: "/accounts", icon: Wallet },
  { name: "Movimientos", href: "/transactions", icon: TrendingUp },
  { name: "Transferencias", href: "/transfers", icon: ArrowLeftRight },
  { name: "Categorías", href: "/categories", icon: Tag },
  { name: "Monedas", href: "/currencies", icon: DollarSign },
  { name: "Reportes", href: "/reports", icon: PieChart },
  { name: "Configuración", href: "/settings", icon: Settings },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const pathname = usePathname()

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-6 py-4 border-b ${collapsed ? "justify-center px-4" : ""}`}>
        <Image src="/cashe-logo.png" alt="Cashé" width={32} height={32} />
        {!collapsed && <span className="text-xl font-bold font-space-grotesk">Cashé</span>}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-6 space-y-2 ${collapsed ? "px-2" : "px-4"}`}>
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              } ${collapsed ? "justify-center" : ""}`}
              onClick={() => setSidebarOpen(false)}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-4 w-4" />
              {!collapsed && item.name}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className={`border-t py-4 space-y-2 ${collapsed ? "px-2" : "px-4"}`}>
        <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">JD</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Juan Pérez</p>
              <p className="text-xs text-muted-foreground truncate">juan@email.com</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`w-full gap-2 ${collapsed ? "justify-center px-2" : "justify-start"}`}
          title={collapsed ? "Cerrar Sesión" : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Cerrar Sesión"}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div
        className={`hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ${
          sidebarCollapsed ? "lg:w-16" : "lg:w-72"
        }`}
      >
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-sidebar border-r border-sidebar-border">
          <SidebarContent collapsed={sidebarCollapsed} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <div className="bg-sidebar h-full">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-72"}`}>
        {/* Top Bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 45,
              duration: 0.1,
            }}
          >
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir sidebar</span>
            </Button>
          </motion.div>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <CurrencySelector />
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="py-4 px-4 sm:py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  )
}
