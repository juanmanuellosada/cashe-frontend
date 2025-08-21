"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { 
  Plus, Search, Edit, Trash2, Eye, EyeOff, 
  // Íconos principales de finanzas
  CreditCard, Wallet, DollarSign, TrendingUp, Banknote, PiggyBank, Coins, Database, Building, Landmark, Euro,
  // Íconos de tipos
  Building2, Target, ShoppingCart, Car, Home, Briefcase,
  // Íconos de administración
  Receipt, Calculator, Archive, Folder, FileText,
  // Íconos de formas
  Circle, Square, Triangle, Diamond, Star, Heart,
  // Íconos especiales
  Gem, Crown, Shield, Key, Lock, Tag,
  // Íconos adicionales ya existentes
  Plane, Coffee, Gift, Gamepad2, Users, Trophy, Zap, Leaf, ShoppingBag, MapPin, Smartphone, Monitor, Calendar, GraduationCap, Stethoscope, Wrench, Paintbrush, Music, Camera, BookOpen, Dumbbell 
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AccountModal } from "@/components/account-modal"
import { DeleteAccountDialog } from "@/components/delete-account-dialog"
import { formatCurrency } from "@/lib/format"
import { formatCurrency as formatCurrencyDisplay } from "@/lib/currency"
import { useCurrency } from "@/contexts/currency-context"

// Datos de ejemplo de cuentas
const initialAccounts = [
  {
    id: 1,
    name: "Cuenta Sueldo",
    balance: 125000,
    currency: "ARS",
    type: "checking",
    isActive: true,
    createdAt: "2024-01-15",
    lastTransaction: "2025-01-15",
    color: undefined,
    icon: undefined,
    image: undefined,
  },
  {
    id: 2,
    name: "Efectivo",
    balance: 15000,
    currency: "ARS",
    type: "cash",
    isActive: true,
    createdAt: "2024-01-15",
    lastTransaction: "2025-01-14",
    color: undefined,
    icon: undefined,
    image: undefined,
  },
  {
    id: 3,
    name: "Tarjeta Crédito",
    balance: -8500,
    currency: "ARS",
    type: "credit",
    isActive: true,
    createdAt: "2024-02-01",
    lastTransaction: "2025-01-13",
    color: undefined,
    icon: undefined,
    image: undefined,
  },
  {
    id: 4,
    name: "Ahorros USD",
    balance: 2500,
    currency: "USD",
    type: "savings",
    isActive: true,
    createdAt: "2024-03-10",
    lastTransaction: "2025-01-10",
    color: undefined,
    icon: undefined,
    image: undefined,
  },
  {
    id: 5,
    name: "Cuenta Inactiva",
    balance: 0,
    currency: "ARS",
    type: "checking",
    isActive: false,
    createdAt: "2023-12-01",
    lastTransaction: "2024-12-15",
    color: undefined,
    icon: undefined,
    image: undefined,
  },
]

export default function AccountsPage() {
  const { displayCurrency, formatDisplayAmount, formatOriginalAmount } = useCurrency()
  const [accounts, setAccounts] = useState(initialAccounts)
  const [searchTerm, setSearchTerm] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [accountModal, setAccountModal] = useState<{ isOpen: boolean; account?: any }>({ isOpen: false })
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; account?: any }>({ isOpen: false })

  const getIconComponent = (iconName: string) => {
    const icons = {
      // Finanzas principales - mapeo exacto con el modal
      "wallet": Wallet,
      "credit-card": CreditCard,
      "piggy-bank": PiggyBank,
      "banknote": Banknote,
      "coins": Coins,
      "landmark": Landmark,
      "database": Database,
      "trending-up": TrendingUp,
      "dollar-sign": DollarSign,
      "euro": Euro,
      
      // Categorías de cuentas - mapeo exacto
      "building": Building,
      "home": Home,
      "car": Car,
      "briefcase": Briefcase,
      
      // Documentos y administración - mapeo exacto
      "receipt": Receipt,
      "calculator": Calculator,
      "archive": Archive,
      "folder": Folder,
      "file-text": FileText,
      
      // Formas básicas - mapeo exacto
      "circle": Circle,
      "square": Square,
      "triangle": Triangle,
      "diamond": Diamond,
      "star": Star,
      "heart": Heart,
      
      // Especiales - mapeo exacto
      "gem": Gem,
      "crown": Crown,
      "target": Target,
      "shield": Shield,
      "key": Key,
      "lock": Lock,
      "tag": Tag,
    }
    const IconComponent = icons[iconName as keyof typeof icons] || Wallet
    return <IconComponent className="h-5 w-5" />
  }

  const getAccountIcon = (account: any) => {
    // Si tiene imagen personalizada, mostrarla
    if (account.image) {
      return (
        <img 
          src={account.image} 
          alt={account.name}
          className="w-full h-full object-cover"
        />
      )
    }
    
    // Si tiene ícono personalizado, usarlo
    if (account.icon) {
      return getIconComponent(account.icon)
    }
    
    // Fallback al ícono por tipo
    switch (account.type) {
      case "checking":
        return <CreditCard className="h-5 w-5" />
      case "savings":
        return <Wallet className="h-5 w-5" />
      case "credit":
        return <CreditCard className="h-5 w-5" />
      case "cash":
        return <DollarSign className="h-5 w-5" />
      default:
        return <Wallet className="h-5 w-5" />
    }
  }

  const getAccountIconContainer = (account: any) => {
    // Si tiene imagen personalizada, contenedor sin borde
    if (account.image) {
      return (
        <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm">
          {getAccountIcon(account)}
        </div>
      )
    }

    // Para íconos normales, contenedor con fondo
    return (
      <div
        style={{
          backgroundColor: account.color ? `${account.color}20` : undefined,
          color: account.color || undefined
        }}
        className={`p-2 rounded-full ${
          !account.color ? 
            (account.type === "credit"
              ? "bg-primary/10 text-primary"
              : account.type === "savings"
                ? "bg-secondary/10 text-secondary"
                : "bg-accent/10 text-accent")
            : ""
        }`}
      >
        {getAccountIcon(account)}
      </div>
    )
  }

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case "checking":
        return "Cuenta Corriente"
      case "savings":
        return "Ahorros"
      case "credit":
        return "Tarjeta de Crédito"
      case "cash":
        return "Efectivo"
      default:
        return "Cuenta"
    }
  }

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = showInactive || account.isActive
    return matchesSearch && matchesStatus
  })

  // Calcular balance total convirtiendo todas las cuentas a la moneda de visualización
  const totalBalance = accounts
    .filter((acc) => acc.isActive)
    .reduce((sum, acc) => {
      // Convertir cada balance a la moneda de visualización y sumar
      const convertedAmount = parseFloat(formatDisplayAmount(acc.balance, acc.currency).replace(/[^\d.-]/g, ''))
      return sum + convertedAmount
    }, 0)

  const activeAccounts = accounts.filter((acc) => acc.isActive).length
  const totalAccounts = accounts.length

  const handleCreateAccount = (accountData: any) => {
    try {
      const newAccount = {
        id: Math.max(...accounts.map((a) => a.id)) + 1,
        ...accountData,
        isActive: true,
        createdAt: new Date().toISOString().split("T")[0],
        lastTransaction: new Date().toISOString().split("T")[0],
      }
      setAccounts([...accounts, newAccount])
      
      // Mostrar notificación de éxito
      toast.success("Cuenta creada exitosamente", {
        description: `${accountData.name} - $${accountData.balance.toLocaleString('es-AR')}`,
      })
    } catch (error) {
      toast.error("Error al crear la cuenta", {
        description: "Hubo un problema al guardar la cuenta. Inténtalo de nuevo.",
      })
    }
  }

  const handleEditAccount = (accountData: any) => {
    try {
      setAccounts(accounts.map((acc) => (acc.id === accountData.id ? { ...acc, ...accountData } : acc)))
      
      // Mostrar notificación de éxito
      toast.success("Cuenta actualizada exitosamente", {
        description: `${accountData.name} ha sido modificada`,
      })
    } catch (error) {
      toast.error("Error al actualizar la cuenta", {
        description: "Hubo un problema al actualizar la cuenta. Inténtalo de nuevo.",
      })
    }
  }

  const handleDeleteAccount = (accountId: number) => {
    try {
      const account = accounts.find(acc => acc.id === accountId)
      setAccounts(accounts.filter((acc) => acc.id !== accountId))
      
      // Mostrar notificación de éxito
      toast.success("Cuenta eliminada exitosamente", {
        description: account ? `${account.name} ha sido eliminada` : "La cuenta ha sido eliminada",
      })
    } catch (error) {
      toast.error("Error al eliminar la cuenta", {
        description: "Hubo un problema al eliminar la cuenta. Inténtalo de nuevo.",
      })
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-space-grotesk">Gestión de Cuentas</h1>
            <p className="text-muted-foreground">Administra todas tus cuentas y saldos</p>
          </div>
          <Button onClick={() => setAccountModal({ isOpen: true })} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cuenta
          </Button>
        </div>

        {/* Resumen de cuentas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{formatCurrencyDisplay(totalBalance, displayCurrency.code)}</div>
              <p className="text-xs text-muted-foreground">En {displayCurrency.name.toLowerCase()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cuentas Activas</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeAccounts}</div>
              <p className="text-xs text-muted-foreground">de {totalAccounts} cuentas totales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monedas</CardTitle>
              <DollarSign className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {[...new Set(accounts.filter((acc) => acc.isActive).map((acc) => acc.currency))].length}
              </div>
              <p className="text-xs text-muted-foreground">Monedas diferentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y búsqueda */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Filtros</CardTitle>
            <Button variant="outline" onClick={() => setShowInactive(!showInactive)} className="gap-2">
              {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {showInactive ? "Ocultar inactivas" : "Mostrar inactivas"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Búsqueda */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar cuentas</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de cuentas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAccounts.map((account) => (
            <Card key={account.id} className={`${!account.isActive ? "opacity-60" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  {getAccountIconContainer(account)}
                  <div>
                    <CardTitle className="text-lg">{account.name}</CardTitle>
                    <CardDescription>{getAccountTypeLabel(account.type)}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!account.isActive && (
                    <Badge variant="secondary" className="text-xs">
                      Inactiva
                    </Badge>
                  )}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setAccountModal({ isOpen: true, account })}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ isOpen: true, account })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Saldo actual</span>
                    <span className={`text-xl font-bold ${account.balance >= 0 ? "text-secondary" : "text-primary"}`}>
                      {formatCurrency(account.balance, account.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Moneda</span>
                    <Badge variant="outline">{account.currency}</Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Última transacción</span>
                    <span>{new Date(account.lastTransaction).toLocaleDateString("es-AR")}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Creada</span>
                    <span>{new Date(account.createdAt).toLocaleDateString("es-AR")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredAccounts.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron cuentas</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm ? "Intenta con otros términos de búsqueda" : "Crea tu primera cuenta para comenzar"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setAccountModal({ isOpen: true })}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Cuenta
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modales */}
      <AccountModal
        isOpen={accountModal.isOpen}
        account={accountModal.account}
        onClose={() => setAccountModal({ isOpen: false })}
        onSave={accountModal.account ? handleEditAccount : handleCreateAccount}
      />

      <DeleteAccountDialog
        isOpen={deleteDialog.isOpen}
        account={deleteDialog.account}
        onClose={() => setDeleteDialog({ isOpen: false })}
        onConfirm={handleDeleteAccount}
      />
    </DashboardLayout>
  )
}
