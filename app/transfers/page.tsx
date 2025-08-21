"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ArrowLeftRight, Search, Edit, Trash2, Plus, TrendingUp, Calendar as CalendarIcon, ChevronDown, Filter, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { DashboardLayout } from "@/components/dashboard-layout"
import { TransferModal } from "@/components/transfer-modal"
import { DeleteTransferDialog } from "@/components/delete-transfer-dialog"
import { formatCurrency } from "@/lib/format"
import { renderAccountIcon } from "@/lib/icon-helpers"

// Datos ficticios de transferencias
const mockTransfers = [
  {
    id: 1,
    description: "Transferencia a ahorros",
    fromAccount: "Cuenta Sueldo",
    toAccount: "Ahorros USD",
    fromAmount: 50000,
    fromCurrency: "ARS",
    toAmount: 50,
    toCurrency: "USD",
    exchangeRate: 1000,
    date: "2024-01-15",
    category: "Ahorro",
  },
  {
    id: 2,
    description: "Pago tarjeta de crédito",
    fromAccount: "Cuenta Sueldo",
    toAccount: "Tarjeta Crédito",
    fromAmount: 25000,
    fromCurrency: "ARS",
    toAmount: 25000,
    toCurrency: "ARS",
    exchangeRate: 1,
    date: "2024-01-10",
    category: "Pago",
  },
  {
    id: 3,
    description: "Retiro de efectivo",
    fromAccount: "Cuenta Sueldo",
    toAccount: "Efectivo",
    fromAmount: 15000,
    fromCurrency: "ARS",
    toAmount: 15000,
    toCurrency: "ARS",
    exchangeRate: 1,
    date: "2024-01-08",
    category: "Retiro",
  },
]

// Cuentas ficticias
const accounts = [
  { id: 1, name: "Cuenta Sueldo", currency: "ARS", balance: 125000, color: "#3B82F6", icon: "credit-card", type: "checking" },
  { id: 2, name: "Efectivo", currency: "ARS", balance: 15000, color: "#10B981", icon: "banknote", type: "cash" },
  { id: 3, name: "Tarjeta Crédito", currency: "ARS", balance: -8500, color: "#F59E0B", icon: "credit-card", type: "credit" },
  { id: 4, name: "Ahorros USD", currency: "USD", balance: 2500, color: "#8B5CF6", icon: "piggy-bank", type: "savings" },
]

// Tasas de cambio ficticias
const exchangeRates = {
  "ARS/USD": 1000,
  "USD/ARS": 0.001,
  "ARS/EUR": 1100,
  "EUR/ARS": 0.0009,
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState(mockTransfers)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [fromAccount, setFromAccount] = useState<string>("all")
  const [toAccount, setToAccount] = useState<string>("all")
  const [transferModal, setTransferModal] = useState<{ isOpen: boolean; transfer?: any }>({ isOpen: false })
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; transfer?: any }>({ isOpen: false })

  // Filtrar transferencias basado en todos los criterios
  const filteredTransfers = transfers.filter((transfer) => {
    // Filtro de búsqueda
    const matchesSearch = searchTerm === "" || 
      transfer.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.fromAccount.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.toAccount.toLowerCase().includes(searchTerm.toLowerCase())

    // Filtro de fecha
    const transferDate = new Date(transfer.date)
    const matchesDate = !dateRange?.from || !dateRange?.to || 
      (transferDate >= dateRange.from && transferDate <= dateRange.to)

    // Filtro de cuenta origen
    const matchesFromAccount = fromAccount === "all" || transfer.fromAccount === fromAccount

    // Filtro de cuenta destino
    const matchesToAccount = toAccount === "all" || transfer.toAccount === toAccount

    return matchesSearch && matchesDate && matchesFromAccount && matchesToAccount
  })

  // Estadísticas basadas en transferencias filtradas
  const totalTransfers = filteredTransfers.length
  const thisMonthTransfers = filteredTransfers.filter((t) => {
    const transferDate = new Date(t.date)
    const now = new Date()
    return transferDate.getMonth() === now.getMonth() && transferDate.getFullYear() === now.getFullYear()
  }).length

  // Volumen total en ARS (conversión simple)
  const totalVolume = filteredTransfers.reduce((sum, transfer) => {
    if (transfer.fromCurrency === "ARS") {
      return sum + transfer.fromAmount
    } else if (transfer.fromCurrency === "USD") {
      return sum + (transfer.fromAmount * exchangeRates["USD/ARS"] * 1000000) // Conversión aproximada
    }
    return sum
  }, 0)

  const getDisplayLabel = () => {
    if (dateRange?.from) {
      if (dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()) {
        return {
          label: `${format(dateRange.from, "dd MMM", { locale: es })} - ${format(dateRange.to, "dd MMM yyyy", { locale: es })}`,
          shortLabel: "Período personalizado",
        }
      } else {
        return {
          label: format(dateRange.from, "dd MMMM yyyy", { locale: es }),
          shortLabel: "Día específico",
        }
      }
    }
    return {
      label: "Seleccionar período",
      shortLabel: "Período",
    }
  }

  const clearFilters = () => {
    setSearchTerm("")
    setDateRange(undefined)
    setFromAccount("all")
    setToAccount("all")
  }

  const hasActiveFilters = searchTerm || dateRange?.from || fromAccount !== "all" || toAccount !== "all"

  const displayLabel = getDisplayLabel()

  const handleCreateTransfer = (transferData: any) => {
    try {
      const newTransfer = { ...transferData, id: transfers.length + 1 }
      setTransfers([...transfers, newTransfer])
      
      // Mostrar notificación de éxito
      toast.success("Transferencia creada exitosamente", {
        description: `$${transferData.fromAmount.toLocaleString('es-AR')} transferidos de ${transferData.fromAccount} a ${transferData.toAccount}`,
      })
    } catch (error) {
      toast.error("Error al crear la transferencia", {
        description: "Hubo un problema al guardar la transferencia. Inténtalo de nuevo.",
      })
    }
  }

  const handleEditTransfer = (transferData: any) => {
    try {
      setTransfers(transfers.map((t) => (t.id === transferData.id ? { ...t, ...transferData } : t)))
      
      // Mostrar notificación de éxito
      toast.success("Transferencia actualizada exitosamente", {
        description: `${transferData.description} ha sido modificada`,
      })
    } catch (error) {
      toast.error("Error al actualizar la transferencia", {
        description: "Hubo un problema al actualizar la transferencia. Inténtalo de nuevo.",
      })
    }
  }

  const handleDeleteTransfer = (transferId: number) => {
    try {
      const transfer = transfers.find(t => t.id === transferId)
      setTransfers(transfers.filter((t) => t.id !== transferId))
      
      // Mostrar notificación de éxito
      toast.success("Transferencia eliminada exitosamente", {
        description: transfer ? `${transfer.description} ha sido eliminada` : "La transferencia ha sido eliminada",
      })
    } catch (error) {
      toast.error("Error al eliminar la transferencia", {
        description: "Hubo un problema al eliminar la transferencia. Inténtalo de nuevo.",
      })
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-space-grotesk">Transferencias</h1>
            <p className="text-muted-foreground">Mueve dinero entre tus cuentas</p>
          </div>
          <Button onClick={() => setTransferModal({ isOpen: true })} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Transferencia
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filtros</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                  <X className="h-4 w-4 mr-1" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Primera fila: Búsqueda y Período */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Búsqueda */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Descripción o cuentas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Selector de fecha */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal hover:!border-orange-500 hover:!text-card-foreground dark:hover:!text-white"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span className="truncate">{displayLabel.label}</span>
                        <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Segunda fila: Cuentas origen y destino */}
              <div className="grid grid-cols-2 gap-4">
                {/* Cuenta origen */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cuenta origen</label>
                  <Select value={fromAccount} onValueChange={setFromAccount}>
                    <SelectTrigger className="hover:!border-orange-500 hover:!text-card-foreground dark:hover:!text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las cuentas</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.name}>
                          <div className="flex items-center gap-2">
                            {renderAccountIcon(account)}
                            <span>{account.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cuenta destino */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cuenta destino</label>
                  <Select value={toAccount} onValueChange={setToAccount}>
                    <SelectTrigger className="hover:!border-orange-500 hover:!text-card-foreground dark:hover:!text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las cuentas</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.name}>
                          <div className="flex items-center gap-2">
                            {renderAccountIcon(account)}
                            <span>{account.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transferencias</CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalTransfers}</div>
              <p className="text-xs text-muted-foreground">Transferencias filtradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{thisMonthTransfers}</div>
              <p className="text-xs text-muted-foreground">Transferencias en enero</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Volumen Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{formatCurrency(totalVolume, "ARS")}</div>
              <p className="text-xs text-muted-foreground">En pesos argentinos</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de transferencias */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historial de Transferencias ({filteredTransfers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTransfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-accent/10 text-accent">
                      <ArrowLeftRight className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{transfer.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{transfer.fromAccount}</span>
                        <ArrowLeftRight className="h-3 w-3" />
                        <span>{transfer.toAccount}</span>
                        <span>•</span>
                        <span>{format(new Date(transfer.date), "dd/MM/yyyy", { locale: es })}</span>
                      </div>
                      {transfer.fromCurrency !== transfer.toCurrency && (
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="text-xs">
                            Tasa: {transfer.exchangeRate} {transfer.fromCurrency}/{transfer.toCurrency}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">-</span>
                        <span className="font-semibold text-primary">
                          {formatCurrency(transfer.fromAmount, transfer.fromCurrency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">+</span>
                        <span className="font-semibold text-secondary">
                          {formatCurrency(transfer.toAmount, transfer.toCurrency)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setTransferModal({ isOpen: true, transfer })}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ isOpen: true, transfer })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredTransfers.length === 0 && (
                <div className="text-center py-12">
                  <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                    <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No se encontraron transferencias</h3>
                  <p className="text-muted-foreground mb-4">
                    {hasActiveFilters
                      ? "Intenta con otros criterios de búsqueda o filtros"
                      : "Crea tu primera transferencia para comenzar"}
                  </p>
                  {!hasActiveFilters && (
                    <Button onClick={() => setTransferModal({ isOpen: true })}>
                      <Plus className="h-4 w-4 mr-2" />
                      Primera Transferencia
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modales */}
        <TransferModal
          isOpen={transferModal.isOpen}
          transfer={transferModal.transfer}
          onClose={() => setTransferModal({ isOpen: false })}
          onSave={transferModal.transfer ? handleEditTransfer : handleCreateTransfer}
          accounts={accounts}
          exchangeRates={exchangeRates}
        />

        <DeleteTransferDialog
          isOpen={deleteDialog.isOpen}
          transfer={deleteDialog.transfer}
          onClose={() => setDeleteDialog({ isOpen: false })}
          onConfirm={handleDeleteTransfer}
        />
      </div>
    </DashboardLayout>
  )
}
