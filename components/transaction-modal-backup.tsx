"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ArrowUpRight, ArrowDownRight, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface TransactionModalProps {
  isOpen: boolean
  transaction?: any
  defaultType?: string
  onClose: () => void
  onSave: (transactionData: any) => void
  categories: { income: string[]; expense: string[] }
  accounts: string[]
}

export function TransactionModal({
  isOpen,
  transaction,
  defaultType,
  onClose,
  onSave,
  categories,
  accounts,
}: TransactionModalProps) {
  const [formData, setFormData] = useState({
    type: "expense",
    description: "",
    amount: "",
    category: "",
    account: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showCalendar, setShowCalendar] = useState(false)

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setFormData({ ...formData, date: date.toISOString().split("T")[0] })
      setShowCalendar(false)
    }
  }

  useEffect(() => {
    if (transaction) {
      const transactionDate = transaction.date ? new Date(transaction.date) : new Date()
      setSelectedDate(transactionDate)
      setFormData({
        type: transaction.type || "expense",
        description: transaction.description || "",
        amount: transaction.amount?.toString() || "",
        category: transaction.category || "",
        account: transaction.account || "",
        date: transaction.date || new Date().toISOString().split("T")[0],
        notes: transaction.notes || "",
      })
    } else {
      setSelectedDate(new Date())
      setFormData({
        type: defaultType || "expense",
        description: "",
        amount: "",
        category: "",
        account: "",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      })
    }
    setErrors({})
  }, [transaction, defaultType, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.description.trim()) {
      newErrors.description = "La descripción es requerida"
    }

    if (!formData.amount.trim()) {
      newErrors.amount = "El monto es requerido"
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = "El monto debe ser un número positivo"
    }

    if (!formData.category) {
      newErrors.category = "La categoría es requerida"
    }

    if (!formData.account) {
      newErrors.account = "La cuenta es requerida"
    }

    if (!formData.date) {
      newErrors.date = "La fecha es requerida"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const transactionData = {
      type: formData.type,
      description: formData.description,
      amount: Number(formData.amount),
      category: formData.category,
      account: formData.account,
      date: formData.date,
      notes: formData.notes,
      ...(transaction && { id: transaction.id }),
    }

    onSave(transactionData)
    onClose()
  }

  const currentCategories = formData.type === "income" ? categories.income : categories.expense

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Editar Transacción" : "Nueva Transacción"}
          </DialogTitle>
          <DialogDescription>
            {transaction
              ? "Modifica los detalles de la transacción"
              : "Completa los datos para crear una nueva transacción"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de transacción */}
          <div className="grid w-full items-center gap-1.5">
            <Label>Tipo *</Label>
            <Tabs
              value={formData.type}
              onValueChange={(value) => {
                setFormData({ ...formData, type: value, category: "" })
                setErrors({ ...errors, category: "" })
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger 
                  value="income" 
                  className="data-[state=active]:bg-secondary/10 data-[state=active]:text-secondary"
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Ingreso
                </TabsTrigger>
                <TabsTrigger 
                  value="expense"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <ArrowDownRight className="h-4 w-4 mr-2" />
                  Gasto
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Monto */}
            <div className="space-y-2">
              <Label htmlFor="amount">Monto *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className={errors.amount ? "border-destructive" : ""}
              />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <Label htmlFor="date">Fecha *</Label>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-card hover:bg-muted/50"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                    locale={es}
                    className="bg-card"
                  />
                </PopoverContent>
              </Popover>
              {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
            </div>
          </div>

          {/* Descripción */}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="description">Descripción *</Label>
            <Input
              id="description"
              placeholder="Ej: Compra de supermercado"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Categoría */}
            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className={`w-full ${errors.category ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {currentCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
            </div>

            {/* Cuenta */}
            <div className="space-y-2">
              <Label htmlFor="account">Cuenta *</Label>
              <Select value={formData.account} onValueChange={(value) => setFormData({ ...formData, account: value })}>
                <SelectTrigger className={`w-full ${errors.account ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Seleccionar cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account} value={account}>
                      {account}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.account && <p className="text-sm text-destructive">{errors.account}</p>}
            </div>
          </div>

          {/* Notas */}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {transaction ? "Guardar cambios" : "Crear transacción"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
