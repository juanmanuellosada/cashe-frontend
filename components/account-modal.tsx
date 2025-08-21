"use client"

import type React from "react"
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
  Heart,
  Gem,
  Crown,
  Target,
  Shield,
  Key,
  Lock
} from "lucide-react"

// Lista de íconos disponibles para cuentas organizados por categorías
const availableIcons = [
  // Finanzas principales
  { name: "wallet", icon: Wallet, label: "Billetera", category: "Finanzas" },
  { name: "credit-card", icon: CreditCard, label: "Tarjeta", category: "Finanzas" },
  { name: "piggy-bank", icon: PiggyBank, label: "Ahorros", category: "Finanzas" },
  { name: "banknote", icon: Banknote, label: "Efectivo", category: "Finanzas" },
  { name: "coins", icon: Coins, label: "Monedas", category: "Finanzas" },
  { name: "landmark", icon: Landmark, label: "Banco", category: "Finanzas" },
  { name: "database", icon: Database, label: "Inversiones", category: "Finanzas" },
  { name: "trending-up", icon: TrendingUp, label: "Crecimiento", category: "Finanzas" },
  { name: "dollar-sign", icon: DollarSign, label: "Dólar", category: "Finanzas" },
  { name: "euro", icon: Euro, label: "Euro", category: "Finanzas" },
  
  // Categorías de cuentas
  { name: "building", icon: Building, label: "Corporativo", category: "Tipos" },
  { name: "home", icon: Home, label: "Personal", category: "Tipos" },
  { name: "car", icon: Car, label: "Vehículo", category: "Tipos" },
  { name: "briefcase", icon: Briefcase, label: "Trabajo", category: "Tipos" },
  
  // Documentos y administración
  { name: "receipt", icon: Receipt, label: "Recibos", category: "Administración" },
  { name: "calculator", icon: Calculator, label: "Calculadora", category: "Administración" },
  { name: "archive", icon: Archive, label: "Archivo", category: "Administración" },
  { name: "folder", icon: Folder, label: "Carpeta", category: "Administración" },
  { name: "file-text", icon: FileText, label: "Documento", category: "Administración" },
  
  // Formas básicas
  { name: "circle", icon: Circle, label: "Círculo", category: "Formas" },
  { name: "square", icon: Square, label: "Cuadrado", category: "Formas" },
  { name: "triangle", icon: Triangle, label: "Triángulo", category: "Formas" },
  { name: "diamond", icon: Diamond, label: "Diamante", category: "Formas" },
  { name: "star", icon: Star, label: "Estrella", category: "Formas" },
  { name: "heart", icon: Heart, label: "Corazón", category: "Formas" },
  
  // Especiales
  { name: "gem", icon: Gem, label: "Gema", category: "Especiales" },
  { name: "crown", icon: Crown, label: "Corona", category: "Especiales" },
  { name: "target", icon: Target, label: "Objetivo", category: "Especiales" },
  { name: "shield", icon: Shield, label: "Escudo", category: "Especiales" },
  { name: "key", icon: Key, label: "Llave", category: "Especiales" },
  { name: "lock", icon: Lock, label: "Candado", category: "Especiales" },
  { name: "tag", icon: Tag, label: "Etiqueta", category: "Especiales" },
]

const categories = ["Todos", "Finanzas", "Tipos", "Administración", "Formas", "Especiales"]

// Función auxiliar para obtener el componente del ícono
const getIconComponent = (iconName: string) => {
  const iconObj = availableIcons.find(icon => icon.name === iconName)
  return iconObj ? iconObj.icon : Tag
}

interface AccountModalProps {
  isOpen: boolean
  account?: any
  onClose: () => void
  onSave: (accountData: any) => void
}

export function AccountModal({ isOpen, account, onClose, onSave }: AccountModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    balance: "",
    currency: "ARS",
    type: "checking",
    isActive: true,
    description: "",
    color: "#3B82F6", // Azul por defecto para cuentas
    icon: "wallet", // Ícono por defecto
    image: null as string | null, // Para imagen personalizada
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Todos")
  const [currentPage, setCurrentPage] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || "",
        balance: account.balance?.toString() || "",
        currency: account.currency || "ARS",
        type: account.type || "checking",
        isActive: account.isActive ?? true,
        description: account.description || "",
        color: account.color || "#3B82F6",
        icon: account.icon || "wallet",
        image: account.image || null,
      })
    } else {
      setFormData({
        name: "",
        balance: "",
        currency: "ARS",
        type: "checking",
        isActive: true,
        description: "",
        color: "#3B82F6",
        icon: "wallet",
        image: null,
      })
    }
    setErrors({})
    setSearchTerm("")
    setSelectedCategory("Todos")
    setCurrentPage(0)
  }, [account, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido"
    }

    if (!formData.balance.trim()) {
      newErrors.balance = "El saldo inicial es requerido"
    } else if (isNaN(Number(formData.balance))) {
      newErrors.balance = "El saldo debe ser un número válido"
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
      ...(account && { id: account.id }),
    }

    onSave(accountData)
    onClose()
  }

  const handleIconSelect = (iconName: string) => {
    setFormData({ ...formData, icon: iconName, image: null })
    setIsIconPickerOpen(false)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona una imagen válida')
        return
      }

      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen debe ser menor a 2MB')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setFormData({ ...formData, image: result, icon: "custom" })
        setIsIconPickerOpen(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeCustomIcon = () => {
    setFormData({ ...formData, image: null, icon: "wallet" })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Filtrar iconos
  const filteredIcons = availableIcons.filter(icon => {
    const matchesSearch = icon.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         icon.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "Todos" || icon.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const totalPages = Math.ceil(filteredIcons.length / ITEMS_PER_PAGE)
  const paginatedIcons = filteredIcons.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  )

  const accountTypes = [
    { value: "checking", label: "Cuenta Corriente" },
    { value: "savings", label: "Ahorros" },
    { value: "credit", label: "Tarjeta de Crédito" },
    { value: "cash", label: "Efectivo" },
  ]

  const currencies = [
    { value: "ARS", label: "Peso Argentino (ARS)" },
    { value: "USD", label: "Dólar Estadounidense (USD)" },
    { value: "EUR", label: "Euro (EUR)" },
    { value: "BRL", label: "Real Brasileño (BRL)" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{account ? "Editar Cuenta" : "Nueva Cuenta"}</DialogTitle>
          <DialogDescription>
            {account
              ? "Modifica los datos de tu cuenta existente"
              : "Crea una nueva cuenta para gestionar tus finanzas"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vista previa de la cuenta */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
            {formData.image ? (
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm">
                <img
                  src={formData.image}
                  alt="Ícono personalizado"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className="w-12 h-12 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                style={{ backgroundColor: formData.color }}
              >
                {(() => {
                  const IconComponent = getIconComponent(formData.icon)
                  return <IconComponent className="h-6 w-6 text-white" />
                })()}
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-medium">
                {formData.name || "Vista previa de la cuenta"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {formData.type === "checking" && "Cuenta Corriente"}
                {formData.type === "savings" && "Ahorros"}
                {formData.type === "credit" && "Tarjeta de Crédito"}
                {formData.type === "cash" && "Efectivo"}
                {formData.currency && ` • ${formData.currency}`}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la cuenta *</Label>
            <Input
              id="name"
              placeholder="Ej: Cuenta Corriente, Efectivo, etc."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Color Picker - Solo visible cuando NO hay imagen personalizada */}
          {!formData.image && (
            <div className="space-y-3">
              <Label>Color de la cuenta *</Label>
              <div className="flex items-center gap-3">
                <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-20 h-12 p-1 rounded-lg"
                      style={{ backgroundColor: formData.color }}
                    >
                      <div className="w-full h-full rounded border-2 border-white shadow-sm" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="start">
                    <div className="space-y-4">
                      <HexColorPicker color={formData.color} onChange={(color) => setFormData({ ...formData, color })} />
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          placeholder="#3B82F6"
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex-1">
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3B82F6"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Selector de Ícono */}
          <div className="space-y-3">
            <Label>Ícono de la cuenta *</Label>
            <div className="space-y-2">
              <Popover open={isIconPickerOpen} onOpenChange={setIsIconPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {formData.image ? (
                        <>
                          <div className="w-6 h-6 rounded-full overflow-hidden">
                            <img
                              src={formData.image}
                              alt="Ícono personalizado"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span>Imagen personalizada</span>
                        </>
                      ) : (
                        (() => {
                          const IconComponent = getIconComponent(formData.icon)
                          return (
                            <>
                              <div
                                className="w-6 h-6 rounded-full border flex items-center justify-center"
                                style={{ backgroundColor: formData.color }}
                              >
                                <IconComponent className="h-3 w-3 text-white" />
                              </div>
                              <span>
                                {availableIcons.find(icon => icon.name === formData.icon)?.label || "Seleccionar ícono"}
                              </span>
                            </>
                          )
                        })()
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0" align="start">
                  <div className="p-4 space-y-4">
                    {/* Búsqueda */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar íconos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Filtro por categoría */}
                    <div className="flex flex-wrap gap-1">
                      {categories.map((cat) => (
                        <Button
                          key={cat}
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "text-xs border-2",
                            selectedCategory === cat ? "border-primary text-primary" : "border-border"
                          )}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>

                    {/* Grilla de íconos */}
                    <ScrollArea className="h-64">
                      <div className="grid grid-cols-6 gap-2">
                        {paginatedIcons.map((iconItem) => {
                          const IconComponent = iconItem.icon
                          return (
                            <Button
                              key={iconItem.name}
                              type="button"
                              variant={formData.icon === iconItem.name ? "default" : "outline"}
                              size="sm"
                              className="aspect-square p-2"
                              onClick={() => handleIconSelect(iconItem.name)}
                              title={iconItem.label}
                            >
                              <IconComponent className="h-4 w-4" />
                            </Button>
                          )
                        })}
                      </div>
                    </ScrollArea>

                    {/* Paginación */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                          disabled={currentPage === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Página {currentPage + 1} de {totalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                          disabled={currentPage === totalPages - 1}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Subir imagen personalizada */}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Subir imagen
                </Button>
                {formData.image && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeCustomIcon}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Sube una imagen PNG, JPG o SVG (máx. 2MB). Se redimensionará automáticamente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona moneda" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de cuenta</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tipo" />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Agrega una descripción para esta cuenta..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
            <Label htmlFor="isActive">Cuenta activa</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {account ? "Actualizar" : "Crear"} Cuenta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
