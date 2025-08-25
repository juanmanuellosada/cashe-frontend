"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { formatCurrency } from "@/lib/format"
import { renderCategoryIcon, renderAccountIcon } from "@/lib/icon-helpers"
import { useCategories } from "@/contexts/categories-context"
import { useAccounts } from "@/contexts/accounts-context"

interface QuickActionModalProps {
  type: string | null
  isOpen: boolean
  onClose: () => void
}

export function QuickActionModal({ type, isOpen, onClose }: QuickActionModalProps) {
  const { getCategoriesByType } = useCategories()
  const { getActiveAccounts } = useAccounts()
  
  const [formData, setFormData] = useState({
    amount: "0",
    description: "",
    category: "",
    account: "",
    destinationAccount: "",
    date: new Date().toISOString().split("T")[0],
  })

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showCalendar, setShowCalendar] = useState(false)
  const [displayAmount, setDisplayAmount] = useState("$0,00")

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d.,]/g, "")
    const numericValue = value.replace(",", ".")
    setFormData({ ...formData, amount: numericValue })

    const number = Number.parseFloat(numericValue) || 0
    setDisplayAmount(formatCurrency(number, "ARS"))
  }

  const handleAmountBlur = () => {
    const number = Number.parseFloat(formData.amount) || 0
    setFormData({ ...formData, amount: number.toString() })
    setDisplayAmount(formatCurrency(number, "ARS"))
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setFormData({ ...formData, date: date.toISOString().split("T")[0] })
      setShowCalendar(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Guardando:", { type, ...formData })
    onClose()
  }

  // Obtener categorías y cuentas del contexto
  const incomeCategories = getCategoriesByType("income")
  const expenseCategories = getCategoriesByType("expense")
  const accounts = getActiveAccounts()

  const getModalTitle = () => {
    switch (type) {
      case "income":
        return "Nuevo Ingreso"
      case "expense":
        return "Nuevo Gasto"
      case "transfer":
        return "Nueva Transferencia"
      case "account":
        return "Nueva Cuenta"
      default:
        return "Acción Rápida"
    }
  }

  const getModalDescription = () => {
    switch (type) {
      case "income":
        return "Registra un nuevo ingreso en tu cuenta"
      case "expense":
        return "Registra un nuevo gasto"
      case "transfer":
        return "Transfiere dinero entre cuentas"
      case "account":
        return "Crea una nueva cuenta para gestionar"
      default:
        return "Completa la información requerida"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getModalTitle()}</DialogTitle>
          <DialogDescription>{getModalDescription()}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === "account" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="account-name">Nombre de la cuenta</Label>
                <Input
                  id="account-name"
                  placeholder="Ej: Cuenta Corriente"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial-balance">Saldo inicial</Label>
                <Input
                  id="initial-balance"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select defaultValue="ARS">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">Peso Argentino (ARS)</SelectItem>
                    <SelectItem value="USD">Dólar (USD)</SelectItem>
                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount">Monto</Label>
                <Input
                  id="amount"
                  placeholder="0"
                  value={formData.amount}
                  onChange={handleAmountChange}
                  onBlur={handleAmountBlur}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  placeholder="Ej: Supermercado, Sueldo, etc."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              {type !== "transfer" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {(type === "income" ? incomeCategories : expenseCategories).map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            <div className="flex items-center gap-2">
                              {renderCategoryIcon(cat)}
                              <span>{cat.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account">Cuenta</Label>
                    <Select
                      value={formData.account}
                      onValueChange={(value) => setFormData({ ...formData, account: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona cuenta" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.name}>
                            <div className="flex items-center gap-2">
                              {renderAccountIcon(acc)}
                              <span>{acc.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {type === "transfer" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account-origin">Cuenta Origen</Label>
                    <Select
                      value={formData.account}
                      onValueChange={(value) => setFormData({ ...formData, account: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona origen" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.name}>
                            <div className="flex items-center gap-2">
                              {renderAccountIcon(acc)}
                              <span>{acc.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-destination">Cuenta Destino</Label>
                    <Select
                      value={formData.destinationAccount}
                      onValueChange={(value) => setFormData({ ...formData, destinationAccount: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.name}>
                            <div className="flex items-center gap-2">
                              {renderAccountIcon(acc)}
                              <span>{acc.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
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
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
