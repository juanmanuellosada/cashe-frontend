"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import {
  Search,
  Edit,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  CalendarIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Laptop,
  Clock,
  Utensils,
  Car,
  Gamepad2,
  Zap,
  Heart,
  GraduationCap,
  MoreHorizontal,
  Tag,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { DashboardLayout } from "@/components/dashboard-layout"
import { TransactionModal } from "@/components/transaction-modal"
import { DeleteTransactionDialog } from "@/components/delete-transaction-dialog"
import { useCategories } from "@/contexts/categories-context"
import { useAccounts } from "@/contexts/accounts-context"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"

// Mapeo de categorías a íconos y colores
const categoryIconMapping = {
  "Sueldo": { icon: Briefcase, color: "#43A047" },
  "Freelance": { icon: Laptop, color: "#81C784" },
  "Inversiones": { icon: TrendingUp, color: "#4CAF50" },
  "Trabajo Extra": { icon: Clock, color: "#66BB6A" },
  "Otros": { icon: MoreHorizontal, color: "#A5D6A7" },
  "Alimentación": { icon: Utensils, color: "#F57C00" },
  "Transporte": { icon: Car, color: "#FF9800" },
  "Entretenimiento": { icon: Gamepad2, color: "#FFB74D" },
  "Servicios": { icon: Zap, color: "#FFCC02" },
  "Salud": { icon: Heart, color: "#FFA726" },
  "Educación": { icon: GraduationCap, color: "#FF8A65" },
}

// Helper para obtener el ícono y color de una categoría
const getCategoryData = (categoryName: string) => {
  return categoryIconMapping[categoryName as keyof typeof categoryIconMapping] || { icon: Tag, color: "#FFAB91" }
}

// Datos de ejemplo de transacciones
const initialTransactions = [
  {
    id: 1,
    type: "income",
    description: "Sueldo Enero",
    amount: 45000,
    category: "Sueldo",
    account: "Cuenta Sueldo",
    date: "2025-01-15",
    createdAt: "2025-01-15T10:00:00Z",
  },
  {
    id: 2,
    type: "expense",
    description: "Supermercado Coto",
    amount: 2500,
    category: "Alimentación",
    account: "Cuenta Sueldo",
    date: "2025-01-15",
    createdAt: "2025-01-15T14:30:00Z",
  },
  {
    id: 3,
    type: "income",
    description: "Freelance Proyecto Web",
    amount: 8000,
    category: "Trabajo Extra",
    account: "Cuenta Sueldo",
    date: "2025-01-14",
    createdAt: "2025-01-14T16:45:00Z",
  },
  {
    id: 4,
    type: "expense",
    description: "Netflix Suscripción",
    amount: 1200,
    category: "Entretenimiento",
    account: "Tarjeta Crédito",
    date: "2025-01-14",
    createdAt: "2025-01-14T09:15:00Z",
  },
  {
    id: 5,
    type: "expense",
    description: "Combustible YPF",
    amount: 3500,
    category: "Transporte",
    account: "Efectivo",
    date: "2025-01-13",
    createdAt: "2025-01-13T18:20:00Z",
  },
  {
    id: 6,
    type: "expense",
    description: "Farmacia",
    amount: 850,
    category: "Salud",
    account: "Efectivo",
    date: "2025-01-13",
    createdAt: "2025-01-13T11:30:00Z",
  },
  {
    id: 7,
    type: "income",
    description: "Venta Usados",
    amount: 1500,
    category: "Otros",
    account: "Efectivo",
    date: "2025-01-12",
    createdAt: "2025-01-12T15:00:00Z",
  },
  {
    id: 8,
    type: "expense",
    description: "Luz Edenor",
    amount: 4200,
    category: "Servicios",
    account: "Cuenta Sueldo",
    date: "2025-01-12",
    createdAt: "2025-01-12T08:45:00Z",
  },
]

export default function TransactionsPage() {
  const { categories } = useCategories()
  const { getActiveAccounts } = useAccounts()
  const accounts = getActiveAccounts()
  const [transactions, setTransactions] = useState(initialTransactions)
  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    category: "all",
    account: "all",
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
    amountFrom: "",
    amountTo: "",
  })
  const [transactionModal, setTransactionModal] = useState<{ isOpen: boolean; transaction?: any; type?: string }>({
    isOpen: false,
  })
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; transaction?: any }>({ isOpen: false })

  // Filtrar transacciones
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(filters.search.toLowerCase())

    const matchesType = filters.type === "all" || transaction.type === filters.type
    const matchesCategory = filters.category === "all" || transaction.category === filters.category
    const matchesAccount = filters.account === "all" || transaction.account === filters.account

    const transactionDate = new Date(transaction.date)
    const matchesDateFrom = !filters.dateFrom || transactionDate >= filters.dateFrom
    const matchesDateTo = !filters.dateTo || transactionDate <= filters.dateTo

    const matchesAmountFrom = !filters.amountFrom || transaction.amount >= Number(filters.amountFrom)
    const matchesAmountTo = !filters.amountTo || transaction.amount <= Number(filters.amountTo)

    return (
      matchesSearch &&
      matchesType &&
      matchesCategory &&
      matchesAccount &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesAmountFrom &&
      matchesAmountTo
    )
  })

  // Estadísticas
  const totalIncome = filteredTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = filteredTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)

  const balance = totalIncome - totalExpenses

  const handleCreateTransaction = (transactionData: any) => {
    try {
      const newTransaction = {
        id: Math.max(...transactions.map((t) => t.id)) + 1,
        ...transactionData,
        createdAt: new Date().toISOString(),
      }
      setTransactions([newTransaction, ...transactions])
      
      // Mostrar notificación de éxito
      const transactionType = transactionData.type === 'income' ? 'ingreso' : 'gasto'
      toast.success(`${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} creado exitosamente`, {
        description: `${transactionData.description} - $${transactionData.amount.toLocaleString('es-AR')}`,
      })
    } catch (error) {
      toast.error("Error al crear la transacción", {
        description: "Hubo un problema al guardar la transacción. Inténtalo de nuevo.",
      })
    }
  }

  const handleEditTransaction = (transactionData: any) => {
    try {
      setTransactions(transactions.map((t) => (t.id === transactionData.id ? { ...t, ...transactionData } : t)))
      
      // Mostrar notificación de éxito
      toast.success("Transacción actualizada exitosamente", {
        description: `${transactionData.description} ha sido modificada`,
      })
    } catch (error) {
      toast.error("Error al actualizar la transacción", {
        description: "Hubo un problema al actualizar la transacción. Inténtalo de nuevo.",
      })
    }
  }

  const handleDeleteTransaction = (transactionId: number) => {
    try {
      const transaction = transactions.find(t => t.id === transactionId)
      setTransactions(transactions.filter((t) => t.id !== transactionId))
      
      // Mostrar notificación de éxito
      toast.success("Transacción eliminada exitosamente", {
        description: transaction ? `${transaction.description} ha sido eliminada` : "La transacción ha sido eliminada",
      })
    } catch (error) {
      toast.error("Error al eliminar la transacción", {
        description: "Hubo un problema al eliminar la transacción. Inténtalo de nuevo.",
      })
    }
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      type: "all",
      category: "all",
      account: "all",
      dateFrom: null,
      dateTo: null,
      amountFrom: "",
      amountTo: "",
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-space-grotesk">Movimientos</h1>
            <p className="text-muted-foreground">Registra y gestiona tus ingresos y gastos</p>
          </div>
          <div className="flex gap-2">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 40,
                duration: 0.15,
              }}
            >
              <Button
                onClick={() => setTransactionModal({ isOpen: true, type: "expense" })}
                variant="outline"
                className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
              >
                <ArrowDownRight className="h-4 w-4 mr-2" />
                Gasto
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 40,
                duration: 0.15,
              }}
            >
              <Button
                onClick={() => setTransactionModal({ isOpen: true, type: "income" })}
                variant="outline"
                className="bg-secondary/10 hover:bg-secondary/20 text-secondary border-secondary/20"
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Ingreso
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{formatCurrency(totalIncome, "ARS")}</div>
              <p className="text-xs text-muted-foreground">
                {filteredTransactions.filter((t) => t.type === "income").length} transacciones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gastos</CardTitle>
              <TrendingDown className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalExpenses, "ARS")}</div>
              <p className="text-xs text-muted-foreground">
                {filteredTransactions.filter((t) => t.type === "expense").length} transacciones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${balance >= 0 ? "text-secondary" : "text-primary"}`}>
                {formatCurrency(balance)}
              </div>
              <p className="text-xs text-muted-foreground">{filteredTransactions.length} transacciones totales</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filtros</CardTitle>
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
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              </motion.div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Fila 1: Búsqueda */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Descripción..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Fila 2: Tipo, Categoría y Cuenta */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Tipo */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo</label>
                  <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="income">Ingresos</SelectItem>
                      <SelectItem value="expense">Gastos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Categoría */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Categoría</label>
                  <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cuenta */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cuenta</label>
                  <Select value={filters.account} onValueChange={(value) => setFilters({ ...filters, account: value })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.name}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fila 3: Rangos de fecha y monto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Grupo de fechas */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Rango de fechas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Desde</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !filters.dateFrom && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yyyy", { locale: es }) : "Fecha desde"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.dateFrom || undefined}
                          onSelect={(date) => setFilters({ ...filters, dateFrom: date || null })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Hasta</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !filters.dateTo && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dateTo ? format(filters.dateTo, "dd/MM/yyyy", { locale: es }) : "Fecha hasta"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filters.dateTo || undefined}
                          onSelect={(date) => setFilters({ ...filters, dateTo: date || null })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Grupo de montos */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Rango de montos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Monto desde</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.amountFrom}
                      onChange={(e) => setFilters({ ...filters, amountFrom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Monto hasta</label>
                    <Input
                      type="number"
                      placeholder="999999"
                      value={filters.amountTo}
                      onChange={(e) => setFilters({ ...filters, amountTo: e.target.value })}
                    />
                  </div>
                </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>        {/* Lista de transacciones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transacciones ({filteredTransactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => {
                const categoryData = getCategoryData(transaction.category)
                const IconComponent = categoryData.icon
                
                return (
                  <div
                    key={transaction.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors gap-3 sm:gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div
                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: categoryData.color }}
                      >
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="font-medium truncate">{transaction.description}</p>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {transaction.category}
                          </Badge>
                          <span className="hidden sm:inline">•</span>
                          <span className="truncate">{transaction.account}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="flex-shrink-0">{format(new Date(transaction.date), "dd/MM/yyyy", { locale: es })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-3">
                      <div className="text-left sm:text-right">
                        <p
                          className={`text-lg font-semibold ${
                            transaction.type === "income" ? "text-secondary" : "text-primary"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "-"}
                          {formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(transaction.createdAt), "HH:mm", { locale: es })}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTransactionModal({ isOpen: true, transaction })}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ isOpen: true, transaction })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Fila de totales - Solo mostrar si hay transacciones filtradas */}
              {filteredTransactions.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg bg-muted/30 border-2 border-dashed gap-3 sm:gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="p-2 rounded-full bg-primary/10 text-primary flex-shrink-0">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="font-semibold">Total Filtrado</p>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                          <span className="flex-shrink-0">{filteredTransactions.length} transacciones</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="flex-shrink-0">Ingresos: {formatCurrency(totalIncome)}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="flex-shrink-0">Gastos: {formatCurrency(totalExpenses)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className={`text-xl font-bold ${balance >= 0 ? "text-secondary" : "text-primary"}`}>
                        {balance >= 0 ? "+" : ""}
                        {formatCurrency(Math.abs(balance))}
                      </p>
                      <p className="text-xs text-muted-foreground">Balance neto</p>
                    </div>
                  </div>
                </div>
              )}

              {filteredTransactions.length === 0 && (
                <div className="text-center py-12">
                  <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No se encontraron transacciones</h3>
                  <p className="text-muted-foreground mb-4">
                    {Object.values(filters).some((v) => v && v !== "all")
                      ? "Intenta ajustar los filtros de búsqueda"
                      : "Crea tu primera transacción para comenzar"}
                  </p>
                  {!Object.values(filters).some((v) => v && v !== "all") && (
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => setTransactionModal({ isOpen: true, type: "income" })}
                        className="bg-secondary hover:bg-secondary/90"
                      >
                        <ArrowUpRight className="h-4 w-4 mr-2" />
                        Primer Ingreso
                      </Button>
                      <Button
                        onClick={() => setTransactionModal({ isOpen: true, type: "expense" })}
                        variant="outline"
                        className="text-primary border-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        <ArrowDownRight className="h-4 w-4 mr-2" />
                        Primer Gasto
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modales */}
      <TransactionModal
        isOpen={transactionModal.isOpen}
        transaction={transactionModal.transaction}
        defaultType={transactionModal.type}
        onClose={() => setTransactionModal({ isOpen: false })}
        onSave={transactionModal.transaction ? handleEditTransaction : handleCreateTransaction}
      />

      <DeleteTransactionDialog
        isOpen={deleteDialog.isOpen}
        transaction={deleteDialog.transaction}
        onClose={() => setDeleteDialog({ isOpen: false })}
        onConfirm={handleDeleteTransaction}
      />
    </DashboardLayout>
  )
}
