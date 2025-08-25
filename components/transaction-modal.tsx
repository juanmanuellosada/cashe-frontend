"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ArrowUpRight, ArrowDownRight, CalendarIcon, Upload, X, FileText } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { renderCategoryIcon, renderAccountIcon } from "@/lib/icon-helpers"
import { useCategories } from "@/contexts/categories-context"
import { useAccounts } from "@/contexts/accounts-context"
import { motion, AnimatePresence } from "framer-motion"

interface TransactionModalProps {
  isOpen: boolean
  transaction?: any
  defaultType?: string
  onClose: () => void
  onSave: (transactionData: any) => void
}

export function TransactionModal({
  isOpen,
  transaction,
  defaultType,
  onClose,
  onSave,
}: TransactionModalProps) {
  const { getCategoriesByType } = useCategories()
  const { getActiveAccounts } = useAccounts()
  
  const receiptInputRef = useRef<HTMLInputElement>(null)
  const voucherInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    type: "expense",
    description: "",
    amount: "",
    category: "",
    account: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    receipt: null as string | null,
    voucher: null as string | null,
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
        receipt: transaction.receipt || null,
        voucher: transaction.voucher || null,
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
        receipt: null,
        voucher: null,
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
      receipt: formData.receipt,
      voucher: formData.voucher,
      ...(transaction && { id: transaction.id }),
    }

    onSave(transactionData)
    onClose()
  }

  const handleFileUpload = (file: File, type: 'receipt' | 'voucher') => {
    if (file) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert('Por favor, selecciona una imagen o PDF válido')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es muy grande. El tamaño máximo es 5MB')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const fileUrl = e.target?.result as string
        setFormData({ ...formData, [type]: fileUrl })
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerFileInput = (type: 'receipt' | 'voucher') => {
    if (type === 'receipt') {
      receiptInputRef.current?.click()
    } else {
      voucherInputRef.current?.click()
    }
  }

  const removeFile = (type: 'receipt' | 'voucher') => {
    setFormData({ ...formData, [type]: null })
  }

  const currentCategories = getCategoriesByType(formData.type as "income" | "expense")
  const accounts = getActiveAccounts()

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 45,
                duration: 0.1 
              }}
            >
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Editar Transacción" : "Nueva Transacción"}
          </DialogTitle>
          <DialogDescription className="my-3">
            {transaction
              ? "Modifica los detalles de la transacción"
              : "Completa los datos para crear una nueva transacción"}
          </DialogDescription>
        </DialogHeader>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* Tipo de transacción */}
          <motion.div 
            className="grid w-full items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
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
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Monto */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
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
            </motion.div>

            {/* Fecha */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Label htmlFor="date">Fecha *</Label>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-card text-card-foreground hover:border-orange-400 hover:text-card-foreground dark:hover:border-orange-400 dark:hover:text-white"
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
            </motion.div>
          </motion.div>

          {/* Descripción */}
          <motion.div 
            className="grid w-full items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <Label htmlFor="description">Descripción *</Label>
            <Input
              id="description"
              placeholder="Ej: Compra de supermercado"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {/* Categoría */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Label htmlFor="category">Categoría *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className={`w-full ${errors.category ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {currentCategories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      <div className="flex items-center gap-2">
                        {renderCategoryIcon(category, "h-4 w-4")}
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
            </motion.div>

            {/* Cuenta */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              <Label htmlFor="account">Cuenta *</Label>
              <Select value={formData.account} onValueChange={(value) => setFormData({ ...formData, account: value })}>
                <SelectTrigger className={`w-full ${errors.account ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Seleccionar cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.name}>
                      <div className="flex items-center gap-2">
                        {renderAccountIcon(account, "h-4 w-4")}
                        <span>{account.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.account && <p className="text-sm text-destructive">{errors.account}</p>}
            </motion.div>
          </motion.div>

          {/* Archivos adjuntos - Solo para gastos */}
          {formData.type === "expense" && (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {/* Factura/Recibo */}
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.52 }}
              >
                <Label>Factura/Recibo (opcional)</Label>
                <div className="space-y-2">
                  {formData.receipt ? (
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground truncate flex-1">
                        Archivo adjunto
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeFile('receipt')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => triggerFileInput('receipt')}
                      className="w-full justify-start gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Subir factura/recibo
                    </Button>
                  )}
                </div>
              </motion.div>

              {/* Comprobante */}
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.54 }}
              >
                <Label>Comprobante (opcional)</Label>
                <div className="space-y-2">
                  {formData.voucher ? (
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground truncate flex-1">
                        Archivo adjunto
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeFile('voucher')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => triggerFileInput('voucher')}
                      className="w-full justify-start gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Subir comprobante
                    </Button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Notas */}
          <motion.div 
            className="grid w-full items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.56 }}
          >
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </motion.div>

          <motion.div 
            className="flex flex-col sm:flex-row justify-end gap-2 pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              {transaction ? "Guardar cambios" : "Crear transacción"}
            </Button>
          </motion.div>
        </motion.form>

        {/* Inputs de archivo ocultos */}
        <input
          ref={receiptInputRef}
          type="file"
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              handleFileUpload(file, 'receipt')
            }
          }}
        />
        <input
          ref={voucherInputRef}
          type="file"
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              handleFileUpload(file, 'voucher')
            }
          }}
        />
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
