"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ArrowLeftRight, AlertCircle, CalendarIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatCurrency } from "@/lib/format"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { renderAccountIcon } from "@/lib/icon-helpers"

interface TransferModalProps {
  isOpen: boolean
  transfer?: any
  onClose: () => void
  onSave: (transferData: any) => void
  accounts: Array<{ 
    name: string; 
    currency: string; 
    balance: number;
    id?: number;
    color?: string;
    icon?: string;
    image?: string;
    type?: string;
  }>
  exchangeRates: Record<string, number>
}

export function TransferModal({ isOpen, transfer, onClose, onSave, accounts, exchangeRates }: TransferModalProps) {
  const [formData, setFormData] = useState({
    fromAccount: "",
    toAccount: "",
    amount: "",
    exchangeRate: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [calculatedAmounts, setCalculatedAmounts] = useState({ fromAmount: 0, toAmount: 0 })
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
    if (transfer) {
      const transferDate = transfer.date ? new Date(transfer.date) : new Date()
      setSelectedDate(transferDate)
      setFormData({
        fromAccount: transfer.fromAccount || "",
        toAccount: transfer.toAccount || "",
        amount: transfer.fromAmount?.toString() || "",
        exchangeRate: transfer.exchangeRate?.toString() || "",
        description: transfer.description || "",
        date: transfer.date || new Date().toISOString().split("T")[0],
      })
    } else {
      setSelectedDate(new Date())
      setFormData({
        fromAccount: "",
        toAccount: "",
        amount: "",
        exchangeRate: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      })
    }
    setErrors({})
  }, [transfer, isOpen])

  // Calcular montos y tasa de cambio automáticamente
  useEffect(() => {
    if (formData.fromAccount && formData.toAccount && formData.amount) {
      const fromAccountData = accounts.find((acc) => acc.name === formData.fromAccount)
      const toAccountData = accounts.find((acc) => acc.name === formData.toAccount)

      if (fromAccountData && toAccountData) {
        const amount = Number(formData.amount)
        const fromCurrency = fromAccountData.currency
        const toCurrency = toAccountData.currency

        if (fromCurrency === toCurrency) {
          // Misma moneda
          setFormData((prev) => ({ ...prev, exchangeRate: "1" }))
          setCalculatedAmounts({ fromAmount: amount, toAmount: amount })
        } else {
          // Monedas diferentes
          const rateKey = `${fromCurrency}-${toCurrency}`
          const systemRate = exchangeRates[rateKey] || 1
          const currentRate = formData.exchangeRate ? Number(formData.exchangeRate) : systemRate

          setFormData((prev) => ({
            ...prev,
            exchangeRate: prev.exchangeRate || systemRate.toString(),
          }))

          const toAmount = amount / currentRate
          setCalculatedAmounts({ fromAmount: amount, toAmount })
        }
      }
    }
  }, [formData.fromAccount, formData.toAccount, formData.amount, formData.exchangeRate, accounts, exchangeRates])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.fromAccount) {
      newErrors.fromAccount = "Selecciona la cuenta de origen"
    }

    if (!formData.toAccount) {
      newErrors.toAccount = "Selecciona la cuenta de destino"
    }

    if (formData.fromAccount === formData.toAccount) {
      newErrors.toAccount = "La cuenta de destino debe ser diferente"
    }

    if (!formData.amount.trim()) {
      newErrors.amount = "El monto es requerido"
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = "El monto debe ser un número positivo"
    }

    if (!formData.description.trim()) {
      newErrors.description = "La descripción es requerida"
    }

    if (!formData.date) {
      newErrors.date = "La fecha es requerida"
    }

    // Validar saldo suficiente
    if (formData.fromAccount && formData.amount) {
      const fromAccountData = accounts.find((acc) => acc.name === formData.fromAccount)
      if (fromAccountData && fromAccountData.balance < Number(formData.amount)) {
        newErrors.amount = "Saldo insuficiente en la cuenta de origen"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const fromAccountData = accounts.find((acc) => acc.name === formData.fromAccount)
    const toAccountData = accounts.find((acc) => acc.name === formData.toAccount)

    const transferData = {
      fromAccount: formData.fromAccount,
      toAccount: formData.toAccount,
      fromAmount: calculatedAmounts.fromAmount,
      toAmount: calculatedAmounts.toAmount,
      fromCurrency: fromAccountData?.currency,
      toCurrency: toAccountData?.currency,
      exchangeRate: Number(formData.exchangeRate),
      description: formData.description,
      date: formData.date,
      ...(transfer && { id: transfer.id }),
    }

    onSave(transferData)
    onClose()
  }

  const fromAccountData = accounts.find((acc) => acc.name === formData.fromAccount)
  const toAccountData = accounts.find((acc) => acc.name === formData.toAccount)
  const isDifferentCurrency = fromAccountData?.currency !== toAccountData?.currency

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{transfer ? "Editar Transferencia" : "Nueva Transferencia"}</DialogTitle>
          <DialogDescription>
            {transfer ? "Modifica los datos de tu transferencia" : "Mueve dinero entre tus cuentas"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cuenta origen */}
            <div className="space-y-2">
              <Label htmlFor="fromAccount">Cuenta de origen *</Label>
              <Select
                value={formData.fromAccount}
                onValueChange={(value) => setFormData({ ...formData, fromAccount: value })}
              >
                <SelectTrigger className={errors.fromAccount ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecciona cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.name} value={account.name}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          {renderAccountIcon(account)}
                          <span className="truncate">{account.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground ml-2 flex-shrink-0">
                          {formatCurrency(account.balance, account.currency)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.fromAccount && <p className="text-sm text-destructive">{errors.fromAccount}</p>}
            </div>

            {/* Cuenta destino */}
            <div className="space-y-2">
              <Label htmlFor="toAccount">Cuenta de destino *</Label>
              <Select
                value={formData.toAccount}
                onValueChange={(value) => setFormData({ ...formData, toAccount: value })}
              >
                <SelectTrigger className={errors.toAccount ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecciona cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((account) => account.name !== formData.fromAccount)
                    .map((account) => (
                      <SelectItem key={account.name} value={account.name}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            {renderAccountIcon(account)}
                            <span className="truncate">{account.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground ml-2 flex-shrink-0">
                            {formatCurrency(account.balance, account.currency)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.toAccount && <p className="text-sm text-destructive">{errors.toAccount}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Monto */}
            <div className="space-y-2">
              <Label htmlFor="amount">Monto a transferir *</Label>
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
                    <span className="truncate">{format(selectedDate, "PPP", { locale: es })}</span>
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

          {/* Tasa de cambio (solo si son monedas diferentes) */}
          {isDifferentCurrency && (
            <div className="space-y-2">
              <Label htmlFor="exchangeRate">
                Tasa de cambio ({fromAccountData?.currency}/{toAccountData?.currency}) *
              </Label>
              <Input
                id="exchangeRate"
                type="number"
                step="0.01"
                placeholder="1.00"
                value={formData.exchangeRate}
                onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Tasa del sistema: {exchangeRates[`${fromAccountData?.currency}-${toAccountData?.currency}`] || "N/A"}
              </p>
            </div>
          )}

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Input
              id="description"
              placeholder="Ej: Ahorro mensual, Pago de servicios, etc."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>

          {/* Resumen de la transferencia */}
          {formData.fromAccount && formData.toAccount && formData.amount && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Se debitará</p>
                    <p className="font-semibold text-primary">
                      {formatCurrency(calculatedAmounts.fromAmount, fromAccountData?.currency || "ARS")}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{formData.fromAccount}</p>
                  </div>
                  <ArrowLeftRight className="h-5 w-5 text-muted-foreground rotate-90 sm:rotate-0" />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Se acreditará</p>
                    <p className="font-semibold text-secondary">
                      {formatCurrency(calculatedAmounts.toAmount, toAccountData?.currency || "ARS")}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{formData.toAccount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advertencia de saldo insuficiente */}
          {fromAccountData && formData.amount && fromAccountData.balance < Number(formData.amount) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Saldo insuficiente. Saldo disponible:{" "}
                {formatCurrency(fromAccountData.balance, fromAccountData.currency)}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
              {transfer ? "Actualizar" : "Realizar"} Transferencia
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
