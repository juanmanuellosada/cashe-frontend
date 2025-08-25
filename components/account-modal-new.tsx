"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { HexColorPicker } from "react-colorful"
import { motion, AnimatePresence } from "framer-motion"
import { modalVariants, formVariants, formItemVariants } from "@/lib/animations"
import { useCurrencies } from "@/contexts/currencies-context"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Upload,
  X,
  // Íconos de finanzas y cuentas
  Wallet,
  CreditCard,
  PiggyBank,
  Banknote,
  Coins,
  Database,
  Building,
  Home,
  Car,
  Briefcase,
  // Íconos adicionales para cuentas
  DollarSign,
  Euro,
  Landmark,
  TrendingUp,
  Receipt,
  Calculator,
  Archive,
  Folder,
  FileText,
  Tag,
  Circle,
  Square,
  Triangle,
  Diamond,
  Star,
} from "lucide-react"

const availableIcons = [
  // Íconos de finanzas principales
  { name: "wallet", icon: Wallet, label: "Billetera", category: "Finanzas" },
  { name: "credit-card", icon: CreditCard, label: "Tarjeta", category: "Finanzas" },
  { name: "piggy-bank", icon: PiggyBank, label: "Ahorro", category: "Finanzas" },
  { name: "banknote", icon: Banknote, label: "Efectivo", category: "Finanzas" },
  { name: "coins", icon: Coins, label: "Monedas", category: "Finanzas" },
  { name: "database", icon: Database, label: "Base de datos", category: "Finanzas" },
  { name: "landmark", icon: Landmark, label: "Banco", category: "Finanzas" },
  { name: "dollar-sign", icon: DollarSign, label: "Dólar", category: "Finanzas" },
  { name: "euro", icon: Euro, label: "Euro", category: "Finanzas" },
  { name: "trending-up", icon: TrendingUp, label: "Inversión", category: "Finanzas" },
  { name: "receipt", icon: Receipt, label: "Recibos", category: "Finanzas" },
  { name: "calculator", icon: Calculator, label: "Calculadora", category: "Finanzas" },
  
  // Íconos de lugares
  { name: "building", icon: Building, label: "Edificio", category: "Lugares" },
  { name: "home", icon: Home, label: "Casa", category: "Lugares" },
  { name: "briefcase", icon: Briefcase, label: "Trabajo", category: "Lugares" },
  
  // Íconos de vehículos
  { name: "car", icon: Car, label: "Auto", category: "Vehículos" },
  
  // Íconos de organización
  { name: "archive", icon: Archive, label: "Archivo", category: "Organización" },
  { name: "folder", icon: Folder, label: "Carpeta", category: "Organización" },
  { name: "file-text", icon: FileText, label: "Documento", category: "Organización" },
  { name: "tag", icon: Tag, label: "Etiqueta", category: "Organización" },
  
  // Formas geométricas
  { name: "circle", icon: Circle, label: "Círculo", category: "Formas" },
  { name: "square", icon: Square, label: "Cuadrado", category: "Formas" },
  { name: "triangle", icon: Triangle, label: "Triángulo", category: "Formas" },
  { name: "diamond", icon: Diamond, label: "Diamante", category: "Formas" },
  { name: "star", icon: Star, label: "Estrella", category: "Formas" },
]

interface AccountModalProps {
  isOpen: boolean
  account?: any
  onClose: () => void
  onSave: (accountData: any) => void
}

export function AccountModal({ isOpen, account, onClose, onSave }: AccountModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { currencies, getPrimaryCurrency } = useCurrencies()
  const primaryCurrency = getPrimaryCurrency()
  
  const [formData, setFormData] = useState({
    name: "",
    type: "cash",
    currency: primaryCurrency?.code || "ARS",
    balance: "",
    color: "#3B82F6",
    icon: "wallet",
    description: "",
    isDefault: false,
    includeInTotal: true,
    image: null as string | null,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentPage, setCurrentPage] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Todos")
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)

  const iconsPerPage = 24
  const categories = ["Todos", ...Array.from(new Set(availableIcons.map(icon => icon.category)))]
  
  const filteredIcons = availableIcons.filter(icon => {
    const matchesSearch = icon.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         icon.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "Todos" || icon.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const totalPages = Math.ceil(filteredIcons.length / iconsPerPage)
  const currentIcons = filteredIcons.slice(currentPage * iconsPerPage, (currentPage + 1) * iconsPerPage)

  useEffect(() => {
    setCurrentPage(0)
  }, [searchTerm, selectedCategory])

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || "",
        type: account.type || "cash",
        currency: account.currency || primaryCurrency?.code || "ARS",
        balance: account.balance?.toString() || "",
        color: account.color || "#3B82F6",
        icon: account.icon || "wallet",
        description: account.description || "",
        isDefault: account.isDefault || false,
        includeInTotal: account.includeInTotal !== false,
        image: account.image || null,
      })
    } else {
      setFormData({
        name: "",
        type: "cash",
        currency: primaryCurrency?.code || "ARS",
        balance: "",
        color: "#3B82F6",
        icon: "wallet",
        description: "",
        isDefault: false,
        includeInTotal: true,
        image: null,
      })
    }
    setErrors({})
    setSearchTerm("")
    setSelectedCategory("Todos")
    setCurrentPage(0)
  }, [account, isOpen, primaryCurrency])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres"
    }

    if (!formData.balance || isNaN(Number(formData.balance))) {
      newErrors.balance = "El saldo debe ser un número válido"
    }

    if (!formData.color) {
      newErrors.color = "Selecciona un color"
    }

    if (!formData.icon) {
      newErrors.icon = "Selecciona un ícono"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const accountData = {
      ...formData,
      balance: Number(formData.balance),
    }

    onSave(accountData)
    onClose()
  }

  const getSelectedIcon = () => {
    const iconData = availableIcons.find(icon => icon.name === formData.icon)
    return iconData ? iconData.icon : Wallet
  }

  const handleFileUpload = (eventOrFile: React.ChangeEvent<HTMLInputElement> | File) => {
    let file: File | null = null
    
    if (eventOrFile instanceof File) {
      file = eventOrFile
    } else {
      file = eventOrFile.target.files?.[0] || null
    }
    
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona una imagen válida')
        return
      }

      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen es muy grande. El tamaño máximo es 2MB')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        setFormData({ ...formData, image: imageUrl })
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto overflow-hidden">
            <motion.div
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <DialogHeader>
                <DialogTitle>{account ? "Editar Cuenta" : "Nueva Cuenta"}</DialogTitle>
                <DialogDescription>
                  {account ? "Modifica los datos de tu cuenta" : "Crea una nueva cuenta para gestionar tu dinero"}
                </DialogDescription>
              </DialogHeader>

              <motion.form
                onSubmit={handleSubmit}
                className="space-y-6"
                variants={formVariants}
                initial="initial"
                animate="animate"
              >
                {/* Nombre */}
                <motion.div variants={formItemVariants} className="space-y-2">
                  <Label htmlFor="name">Nombre de la cuenta *</Label>
                  <Input
                    id="name"
                    placeholder="Ej: Cuenta corriente, Ahorros, etc."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </motion.div>

                {/* Tipo de cuenta y moneda */}
                <motion.div variants={formItemVariants} className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de cuenta</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="bank">Cuenta bancaria</SelectItem>
                        <SelectItem value="credit">Tarjeta de crédito</SelectItem>
                        <SelectItem value="savings">Ahorros</SelectItem>
                        <SelectItem value="investment">Inversión</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Moneda</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name}
                            {currency.isPrimary && " (Principal)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>

                {/* Saldo inicial */}
                <motion.div variants={formItemVariants} className="space-y-2">
                  <Label htmlFor="balance">Saldo inicial *</Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    className={errors.balance ? "border-destructive" : ""}
                  />
                  {errors.balance && <p className="text-sm text-destructive">{errors.balance}</p>}
                </motion.div>

                {/* Color e ícono */}
                <motion.div variants={formItemVariants} className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Color *</Label>
                    <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2"
                        >
                          <div
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: formData.color }}
                          />
                          {formData.color}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64" align="start">
                        <HexColorPicker
                          color={formData.color}
                          onChange={(color) => setFormData({ ...formData, color })}
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.color && <p className="text-sm text-destructive">{errors.color}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Ícono *</Label>
                    <Popover open={isIconPickerOpen} onOpenChange={setIsIconPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2"
                        >
                          {React.createElement(getSelectedIcon(), {
                            className: "w-4 h-4",
                            style: { color: formData.color }
                          })}
                          {availableIcons.find(icon => icon.name === formData.icon)?.label || "Seleccionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96 animate-duration-200" align="start">
                        <motion.div 
                          className="space-y-4"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {/* Búsqueda */}
                          <motion.div 
                            className="relative"
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.05 }}
                          >
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              placeholder="Buscar íconos..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-8"
                            />
                          </motion.div>

                          {/* Categorías */}
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.1 }}
                          >
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(category => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </motion.div>

                          {/* Grid de íconos */}
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.15 }}
                          >
                            <ScrollArea className="h-48">
                              <div className="grid grid-cols-6 gap-2">
                                {currentIcons.map((iconData, index) => (
                                  <motion.div
                                    key={iconData.name}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ 
                                      duration: 0.15,
                                      delay: 0.02 * index,
                                      ease: "easeOut"
                                    }}
                                  >
                                    <Button
                                      variant={formData.icon === iconData.name ? "default" : "outline"}
                                      size="sm"
                                      className="h-10 w-full p-1 icon-button transition-all duration-150 hover:scale-105"
                                      onClick={() => {
                                        setFormData({ ...formData, icon: iconData.name })
                                        setIsIconPickerOpen(false)
                                      }}
                                    >
                                      {React.createElement(iconData.icon, {
                                        className: "w-4 h-4",
                                        style: { color: formData.icon === iconData.name ? "white" : formData.color }
                                      })}
                                    </Button>
                                  </motion.div>
                                ))}
                              </div>
                            </ScrollArea>
                          </motion.div>

                          {/* Paginación */}
                          {totalPages > 1 && (
                            <motion.div 
                              className="flex items-center justify-between"
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2, delay: 0.2 }}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                disabled={currentPage === 0}
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                              <span className="text-sm text-muted-foreground">
                                {currentPage + 1} de {totalPages}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                                disabled={currentPage === totalPages - 1}
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </motion.div>
                          )}
                        </motion.div>
                      </PopoverContent>
                    </Popover>
                    {errors.icon && <p className="text-sm text-destructive">{errors.icon}</p>}
                  </div>
                </motion.div>

                {/* Descripción */}
                <motion.div variants={formItemVariants} className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Descripción opcional de la cuenta..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </motion.div>

                {/* Opciones adicionales */}
                <motion.div variants={formItemVariants} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isDefault">Cuenta por defecto</Label>
                    <Switch
                      id="isDefault"
                      checked={formData.isDefault}
                      onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="includeInTotal">Incluir en total general</Label>
                    <Switch
                      id="includeInTotal"
                      checked={formData.includeInTotal}
                      onCheckedChange={(checked) => setFormData({ ...formData, includeInTotal: checked })}
                    />
                  </div>
                </motion.div>

                {/* Imagen personalizada */}
                <motion.div variants={formItemVariants} className="space-y-2">
                  <Label>Imagen personalizada (opcional)</Label>
                  <div className="flex items-center gap-4">
                    {formData.image && (
                      <div className="relative">
                        <img
                          src={formData.image}
                          alt="Preview"
                          className="w-16 h-16 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 p-0"
                          onClick={() => setFormData({ ...formData, image: null })}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={triggerFileInput}
                      className="gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {formData.image ? "Cambiar imagen" : "Subir imagen"}
                    </Button>
                  </div>
                </motion.div>

                {/* Botones */}
                <motion.div variants={formItemVariants} className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className={formData.type === "credit" ? "bg-red-600 hover:bg-red-700" : ""}
                  >
                    {account ? "Actualizar" : "Crear"} Cuenta
                  </Button>
                </motion.div>
              </motion.form>
              
              {/* Input de archivo oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
