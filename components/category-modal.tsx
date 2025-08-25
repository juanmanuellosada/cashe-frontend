"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { HexColorPicker } from "react-colorful"
import { motion, AnimatePresence } from "framer-motion"

import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Upload,
  X,
  // Íconos principales (todos los disponibles en Lucide React)
  Activity,
  Airplay,
  AlertCircle,
  AlertTriangle,
  Anchor,
  Apple,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  AtSign,
  Award,
  Baby,
  Backpack,
  Badge,
  Banknote,
  Battery,
  Bed,
  Beer,
  Bell,
  Bike,
  Book,
  Bookmark,
  Box,
  Briefcase,
  Building,
  Bus,
  Calculator,
  Calendar,
  Camera,
  Car,
  ShoppingCart,
  Check,
  ChefHat,
  Circle,
  Clock,
  Cloud,
  Coffee,
  Coins,
  Computer,
  Cookie,
  CreditCard,
  Crown,
  Database,
  Diamond,
  Dog,
  DollarSign,
  Download,
  Droplets,
  Euro,
  Eye,
  Factory,
  FastForward,
  Film,
  Filter,
  Fish,
  Flag,
  Flame,
  Flashlight,
  Flower,
  Folder,
  FolderOpen,
  Fuel,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  Hand,
  Headphones,
  Heart,
  Home,
  Hospital,
  Hotel,
  Image,
  Inbox,
  Info,
  Key,
  Landmark,
  Laptop,
  Library,
  Lightbulb,
  Link,
  Lock,
  Mail,
  Map,
  Medal,
  Megaphone,
  MessageCircle,
  Mic,
  Monitor,
  Moon,
  Mountain,
  Music,
  Navigation,
  Newspaper,
  Package,
  Paintbrush,
  Paperclip,
  PartyPopper,
  Phone,
  Piano,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Play,
  Plus,
  Pocket,
  Printer,
  Radio,
  Receipt,
  Recycle,
  Repeat,
  Rocket,
  Scissors,
  Settings,
  Shield,
  Ship,
  ShoppingBag,
  ShoppingCart as CartIcon,
  Shuffle,
  Smartphone,
  Smile,
  Snowflake,
  Speaker,
  Square,
  Star,
  Sun,
  Tag,
  Target,
  Thermometer,
  ThumbsUp,
  Ticket,
  Timer,
  Train,
  Trash,
  TrendingUp as TrendingUpIcon,
  Triangle,
  Trophy,
  Truck,
  Tv,
  Umbrella,
  University,
  Upload as UploadIcon,
  User,
  Users,
  Utensils,
  Video,
  Wallet,
  Watch,
  Wifi,
  Wind,
  Wine,
  Wrench,
  Zap,
} from "lucide-react"

// Lista completa de íconos organizados por categorías
const availableIcons = [
  // Finanzas
  { name: "banknote", icon: Banknote, label: "Billetes", category: "Finanzas" },
  { name: "coins", icon: Coins, label: "Monedas", category: "Finanzas" },
  { name: "credit-card", icon: CreditCard, label: "Tarjeta", category: "Finanzas" },
  { name: "wallet", icon: Wallet, label: "Billetera", category: "Finanzas" },
  { name: "piggy-bank", icon: PiggyBank, label: "Alcancía", category: "Finanzas" },
  { name: "dollar-sign", icon: DollarSign, label: "Dólar", category: "Finanzas" },
  { name: "euro", icon: Euro, label: "Euro", category: "Finanzas" },
  { name: "landmark", icon: Landmark, label: "Banco", category: "Finanzas" },
  { name: "receipt", icon: Receipt, label: "Recibo", category: "Finanzas" },
  { name: "calculator", icon: Calculator, label: "Calculadora", category: "Finanzas" },
  
  // Alimentación
  { name: "utensils", icon: Utensils, label: "Comida", category: "Alimentación" },
  { name: "coffee", icon: Coffee, label: "Café", category: "Alimentación" },
  { name: "pizza", icon: Pizza, label: "Pizza", category: "Alimentación" },
  { name: "apple", icon: Apple, label: "Fruta", category: "Alimentación" },
  { name: "cookie", icon: Cookie, label: "Dulces", category: "Alimentación" },
  { name: "wine", icon: Wine, label: "Vino", category: "Alimentación" },
  { name: "beer", icon: Beer, label: "Cerveza", category: "Alimentación" },
  { name: "chef-hat", icon: ChefHat, label: "Cocina", category: "Alimentación" },
  { name: "droplets", icon: Droplets, label: "Bebidas frías", category: "Alimentación" },
  
  // Transporte
  { name: "car", icon: Car, label: "Auto", category: "Transporte" },
  { name: "bus", icon: Bus, label: "Autobús", category: "Transporte" },
  { name: "bike", icon: Bike, label: "Bicicleta", category: "Transporte" },
  { name: "plane", icon: Plane, label: "Avión", category: "Transporte" },
  { name: "train", icon: Train, label: "Tren", category: "Transporte" },
  { name: "ship", icon: Ship, label: "Barco", category: "Transporte" },
  { name: "truck", icon: Truck, label: "Camión", category: "Transporte" },
  { name: "fuel", icon: Fuel, label: "Combustible", category: "Transporte" },
  
  // Hogar
  { name: "home", icon: Home, label: "Casa", category: "Hogar" },
  { name: "bed", icon: Bed, label: "Dormitorio", category: "Hogar" },
  { name: "lightbulb", icon: Lightbulb, label: "Electricidad", category: "Hogar" },
  { name: "droplets", icon: Droplets, label: "Agua", category: "Hogar" },
  { name: "flame", icon: Flame, label: "Gas", category: "Hogar" },
  { name: "wifi", icon: Wifi, label: "Internet", category: "Hogar" },
  { name: "tv", icon: Tv, label: "Televisión", category: "Hogar" },
  { name: "wrench", icon: Wrench, label: "Reparaciones", category: "Hogar" },
  
  // Entretenimiento
  { name: "gamepad-2", icon: Gamepad2, label: "Videojuegos", category: "Entretenimiento" },
  { name: "film", icon: Film, label: "Cine", category: "Entretenimiento" },
  { name: "music", icon: Music, label: "Música", category: "Entretenimiento" },
  { name: "headphones", icon: Headphones, label: "Auriculares", category: "Entretenimiento" },
  { name: "book", icon: Book, label: "Libros", category: "Entretenimiento" },
  { name: "party-popper", icon: PartyPopper, label: "Fiesta", category: "Entretenimiento" },
  { name: "camera", icon: Camera, label: "Fotografía", category: "Entretenimiento" },
  { name: "activity", icon: Activity, label: "Deportes", category: "Entretenimiento" },
  
  // Salud
  { name: "heart", icon: Heart, label: "Salud", category: "Salud" },
  { name: "pill", icon: Pill, label: "Medicinas", category: "Salud" },
  { name: "hospital", icon: Hospital, label: "Hospital", category: "Salud" },
  { name: "activity", icon: Activity, label: "Ejercicio", category: "Salud" },
  { name: "thermometer", icon: Thermometer, label: "Temperatura", category: "Salud" },
  
  // Compras
  { name: "shopping-bag", icon: ShoppingBag, label: "Compras", category: "Compras" },
  { name: "shopping-cart", icon: ShoppingCart, label: "Carrito", category: "Compras" },
  { name: "gift", icon: Gift, label: "Regalos", category: "Compras" },
  { name: "package", icon: Package, label: "Paquetes", category: "Compras" },
  
  // Educación
  { name: "graduation-cap", icon: GraduationCap, label: "Educación", category: "Educación" },
  { name: "library", icon: Library, label: "Biblioteca", category: "Educación" },
  { name: "university", icon: University, label: "Universidad", category: "Educación" },
  
  // Trabajo
  { name: "briefcase", icon: Briefcase, label: "Trabajo", category: "Trabajo" },
  { name: "building", icon: Building, label: "Oficina", category: "Trabajo" },
  { name: "laptop", icon: Laptop, label: "Computadora", category: "Trabajo" },
  { name: "printer", icon: Printer, label: "Impresora", category: "Trabajo" },
  
  // Comunicación
  { name: "phone", icon: Phone, label: "Teléfono", category: "Comunicación" },
  { name: "smartphone", icon: Smartphone, label: "Móvil", category: "Comunicación" },
  { name: "mail", icon: Mail, label: "Correo", category: "Comunicación" },
  { name: "message-circle", icon: MessageCircle, label: "Mensajes", category: "Comunicación" },
  
  // Viajes
  { name: "map", icon: Map, label: "Mapa", category: "Viajes" },
  { name: "hotel", icon: Hotel, label: "Hotel", category: "Viajes" },
  { name: "backpack", icon: Backpack, label: "Mochila", category: "Viajes" },
  { name: "ticket", icon: Ticket, label: "Tickets", category: "Viajes" },
  
  // Servicios
  { name: "scissors", icon: Scissors, label: "Peluquería", category: "Servicios" },
  { name: "paintbrush", icon: Paintbrush, label: "Belleza", category: "Servicios" },
  { name: "settings", icon: Settings, label: "Servicios", category: "Servicios" },
  
  // General
  { name: "tag", icon: Tag, label: "Etiqueta", category: "General" },
  { name: "star", icon: Star, label: "Estrella", category: "General" },
  { name: "circle", icon: Circle, label: "Círculo", category: "General" },
  { name: "square", icon: Square, label: "Cuadrado", category: "General" },
  { name: "triangle", icon: Triangle, label: "Triángulo", category: "General" },
  { name: "diamond", icon: Diamond, label: "Diamante", category: "General" },
  { name: "crown", icon: Crown, label: "Corona", category: "General" },
  { name: "award", icon: Award, label: "Premio", category: "General" },
  { name: "trophy", icon: Trophy, label: "Trofeo", category: "General" },
  { name: "medal", icon: Medal, label: "Medalla", category: "General" },
]

interface CategoryModalProps {
  isOpen: boolean
  category?: any
  defaultType?: string
  onClose: () => void
  onSave: (categoryData: any) => void
}

export function CategoryModal({ 
  isOpen, 
  category, 
  defaultType = "expense", 
  onClose, 
  onSave 
}: CategoryModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    color: "#F57C00",
    icon: "tag",
    type: "expense",
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
    if (category) {
      setFormData({
        name: category.name || "",
        color: category.color || "#F57C00",
        icon: category.icon || "tag",
        type: category.type || "expense",
        image: category.image || null,
      })
    } else {
      setFormData({
        name: "",
        color: "#F57C00",
        icon: "tag",
        type: defaultType || "expense",
        image: null,
      })
    }
    setErrors({})
    setSearchTerm("")
    setSelectedCategory("Todos")
    setCurrentPage(0)
  }, [category, defaultType, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres"
    }

    // Solo validar color e ícono si no hay imagen personalizada
    if (!formData.image) {
      if (!formData.color) {
        newErrors.color = "Selecciona un color"
      }

      if (!formData.icon) {
        newErrors.icon = "Selecciona un ícono"
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

    const categoryData = {
      ...formData,
      name: formData.name.trim(),
      ...(category && { id: category.id }),
    }

    onSave(categoryData)
    onClose()
  }

  const handleIconSelect = (iconName: string) => {
    setFormData({ ...formData, icon: iconName, image: null })
    setIsIconPickerOpen(false)
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

  const getSelectedIcon = () => {
    const iconData = availableIcons.find(icon => icon.name === formData.icon)
    return iconData ? iconData.icon : Tag
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto overflow-hidden">
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
                <DialogTitle>{category ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
                <DialogDescription className="my-3">
                  {category ? "Modifica los datos de tu categoría" : "Crea una nueva categoría para organizar tus finanzas"}
                </DialogDescription>
              </DialogHeader>

              <motion.form
                onSubmit={handleSubmit}
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {/* Tipo de categoría */}
                {!category && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    <Tabs value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="income" className="gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Ingresos
                        </TabsTrigger>
                        <TabsTrigger value="expense" className="gap-2">
                          <TrendingDown className="h-4 w-4" />
                          Gastos
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </motion.div>
                )}

                {/* Nombre */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Label htmlFor="name">Nombre de la categoría *</Label>
                  <Input
                    id="name"
                    placeholder="Ej: Alimentación, Sueldo, etc."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </motion.div>

                {/* Subir imagen personalizada */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                >
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

                {/* Color e ícono (solo si no hay imagen personalizada) */}
                {!formData.image && (
                  <motion.div 
                    className="grid grid-cols-2 gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
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
                        <PopoverContent className="w-96" align="start">
                          <div className="space-y-4">
                            {/* Búsqueda */}
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                              <Input
                                placeholder="Buscar íconos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                              />
                            </div>

                            {/* Categorías */}
                            <select
                              value={selectedCategory}
                              onChange={(e) => setSelectedCategory(e.target.value)}
                              className="w-full p-2 border rounded"
                            >
                              {categories.map(category => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>

                            {/* Grid de íconos */}
                            <ScrollArea className="h-48">
                              <div className="grid grid-cols-6 gap-2">
                                {currentIcons.map((iconData) => (
                                  <Button
                                    key={iconData.name}
                                    variant={formData.icon === iconData.name ? "default" : "outline"}
                                    size="sm"
                                    className="h-10 w-full p-1"
                                    onClick={() => handleIconSelect(iconData.name)}
                                  >
                                    {React.createElement(iconData.icon, {
                                      className: "w-4 h-4",
                                      style: { color: formData.icon === iconData.name ? "white" : formData.color }
                                    })}
                                  </Button>
                                ))}
                              </div>
                            </ScrollArea>

                            {/* Paginación */}
                            {totalPages > 1 && (
                              <div className="flex items-center justify-between">
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
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                      {errors.icon && <p className="text-sm text-destructive">{errors.icon}</p>}
                    </div>
                  </motion.div>
                )}

                {/* Vista previa */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  <Label>Vista previa</Label>
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: formData.image ? 'transparent' : formData.color }}
                      >
                        {formData.image ? (
                          <img 
                            src={formData.image} 
                            alt="Icon" 
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          React.createElement(getSelectedIcon(), {
                            className: "w-6 h-6 text-white"
                          })
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{formData.name || "Nombre de la categoría"}</div>
                        <div className="text-sm text-muted-foreground">
                          {formData.type === "income" ? "Categoría de ingresos" : "Categoría de gastos"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {formData.type === "income" ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <TrendingUp className="w-4 h-4" />
                              Ingreso
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-600">
                              <TrendingDown className="w-4 h-4" />
                              Gasto
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Botones */}
                <motion.div 
                  className="flex justify-end gap-3 pt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className={
                      formData.type === "income" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                    }
                  >
                    {category ? "Actualizar" : "Crear"} Categoría
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
