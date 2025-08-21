"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { HexColorPicker } from "react-colorful"
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Upload,
  Trash2,
  // Trabajo y Profesión
  Briefcase,
  Laptop,
  Laptop2,
  Clock,
  Building,
  Monitor,
  Code,
  // Finanzas
  PiggyBank,
  CreditCard,
  Wallet,
  Banknote,
  Coins,
  Database,
  // Alimentación y Bebidas
  Utensils,
  Coffee,
  Pizza,
  Cookie,
  Wine,
  Egg,
  // Transporte
  Car,
  Bus,
  Bike,
  Plane,
  Train,
  Truck,
  // Hogar y Vida
  Home,
  Sofa,
  Umbrella,
  Key,
  Lightbulb,
  Flame,
  // Entretenimiento
  Gamepad2,
  Gamepad,
  Music,
  Tv,
  Film,
  Camera,
  Headphones,
  Speaker,
  Radio,
  // Salud y Deporte
  Heart,
  Dumbbell,
  Activity,
  Thermometer,
  // Educación y Libros
  GraduationCap,
  Book,
  Library,
  Pencil,
  // Compras y Regalos
  ShoppingBag,
  Gift,
  Shirt,
  Gem,
  // Comunicación y Tecnología
  Phone,
  Smartphone,
  Wifi,
  Mail,
  Cloud,
  // Servicios
  Zap,
  Wrench,
  Hammer,
  Printer,
  // Naturaleza y Clima
  Trees,
  Flower,
  Leaf,
  Sun,
  Moon,
  Snowflake,
  Mountain,
  Earth,
  // Premios y Logros
  Award,
  Medal,
  Crown,
  Star,
  Target,
  // Otros
  Tag,
  MoreHorizontal,
  Circle,
  User,
  Eye,
  Watch,
  Calendar,
  Map,
  Compass,
  Anchor,
  Rocket,
  Diamond,
} from "lucide-react"

interface CategoryModalProps {
  isOpen: boolean
  category?: any
  defaultType?: string
  onClose: () => void
  onSave: (categoryData: any) => void
}

// Lista completa de íconos organizados por categorías
const availableIcons = [
  // Trabajo y Profesión
  { name: "briefcase", icon: Briefcase, label: "Trabajo", category: "Trabajo" },
  { name: "laptop", icon: Laptop, label: "Freelance", category: "Trabajo" },
  { name: "laptop2", icon: Laptop2, label: "Computadora", category: "Trabajo" },
  { name: "clock", icon: Clock, label: "Horas extra", category: "Trabajo" },
  { name: "building", icon: Building, label: "Oficina", category: "Trabajo" },
  { name: "monitor", icon: Monitor, label: "Monitor", category: "Trabajo" },
  { name: "code", icon: Code, label: "Programación", category: "Trabajo" },
  
  // Finanzas
  { name: "piggy-bank", icon: PiggyBank, label: "Ahorros", category: "Finanzas" },
  { name: "credit-card", icon: CreditCard, label: "Tarjetas", category: "Finanzas" },
  { name: "wallet", icon: Wallet, label: "Efectivo", category: "Finanzas" },
  { name: "banknote", icon: Banknote, label: "Billetes", category: "Finanzas" },
  { name: "coins", icon: Coins, label: "Monedas", category: "Finanzas" },
  { name: "trending-up", icon: TrendingUp, label: "Inversiones", category: "Finanzas" },
  { name: "database", icon: Database, label: "Base de datos", category: "Finanzas" },
  
  // Alimentación y Bebidas
  { name: "utensils", icon: Utensils, label: "Alimentación", category: "Comida" },
  { name: "coffee", icon: Coffee, label: "Café", category: "Comida" },
  { name: "pizza", icon: Pizza, label: "Pizza", category: "Comida" },
  { name: "cookie", icon: Cookie, label: "Postres", category: "Comida" },
  { name: "wine", icon: Wine, label: "Bebidas", category: "Comida" },
  { name: "egg", icon: Egg, label: "Huevos", category: "Comida" },
  
  // Transporte
  { name: "car", icon: Car, label: "Auto", category: "Transporte" },
  { name: "bus", icon: Bus, label: "Autobús", category: "Transporte" },
  { name: "bike", icon: Bike, label: "Bicicleta", category: "Transporte" },
  { name: "plane", icon: Plane, label: "Avión", category: "Transporte" },
  { name: "train", icon: Train, label: "Tren", category: "Transporte" },
  { name: "truck", icon: Truck, label: "Camión", category: "Transporte" },
  
  // Hogar y Vida
  { name: "home", icon: Home, label: "Hogar", category: "Hogar" },
  { name: "sofa", icon: Sofa, label: "Muebles", category: "Hogar" },
  { name: "umbrella", icon: Umbrella, label: "Paraguas", category: "Hogar" },
  { name: "key", icon: Key, label: "Llaves", category: "Hogar" },
  { name: "lightbulb", icon: Lightbulb, label: "Electricidad", category: "Hogar" },
  { name: "flame", icon: Flame, label: "Gas", category: "Hogar" },
  
  // Entretenimiento
  { name: "gamepad2", icon: Gamepad2, label: "Videojuegos", category: "Entretenimiento" },
  { name: "gamepad", icon: Gamepad, label: "Juegos", category: "Entretenimiento" },
  { name: "music", icon: Music, label: "Música", category: "Entretenimiento" },
  { name: "tv", icon: Tv, label: "Televisión", category: "Entretenimiento" },
  { name: "film", icon: Film, label: "Películas", category: "Entretenimiento" },
  { name: "camera", icon: Camera, label: "Fotografía", category: "Entretenimiento" },
  { name: "headphones", icon: Headphones, label: "Auriculares", category: "Entretenimiento" },
  { name: "speaker", icon: Speaker, label: "Altavoces", category: "Entretenimiento" },
  { name: "radio", icon: Radio, label: "Radio", category: "Entretenimiento" },
  
  // Salud y Deporte
  { name: "heart", icon: Heart, label: "Salud", category: "Salud" },
  { name: "dumbbell", icon: Dumbbell, label: "Ejercicio", category: "Salud" },
  { name: "activity", icon: Activity, label: "Actividad", category: "Salud" },
  { name: "thermometer", icon: Thermometer, label: "Medicina", category: "Salud" },
  
  // Educación y Libros
  { name: "graduation-cap", icon: GraduationCap, label: "Educación", category: "Educación" },
  { name: "book", icon: Book, label: "Libros", category: "Educación" },
  { name: "library", icon: Library, label: "Biblioteca", category: "Educación" },
  { name: "pencil", icon: Pencil, label: "Escritura", category: "Educación" },
  
  // Compras y Regalos
  { name: "shopping-bag", icon: ShoppingBag, label: "Compras", category: "Compras" },
  { name: "gift", icon: Gift, label: "Regalos", category: "Compras" },
  { name: "shirt", icon: Shirt, label: "Ropa", category: "Compras" },
  { name: "gem", icon: Gem, label: "Joyas", category: "Compras" },
  
  // Comunicación y Tecnología
  { name: "phone", icon: Phone, label: "Teléfono", category: "Tecnología" },
  { name: "smartphone", icon: Smartphone, label: "Móvil", category: "Tecnología" },
  { name: "wifi", icon: Wifi, label: "Internet", category: "Tecnología" },
  { name: "mail", icon: Mail, label: "Email", category: "Tecnología" },
  { name: "cloud", icon: Cloud, label: "Nube", category: "Tecnología" },
  
  // Servicios
  { name: "zap", icon: Zap, label: "Electricidad", category: "Servicios" },
  { name: "wrench", icon: Wrench, label: "Reparaciones", category: "Servicios" },
  { name: "hammer", icon: Hammer, label: "Construcción", category: "Servicios" },
  { name: "printer", icon: Printer, label: "Impresora", category: "Servicios" },
  
  // Naturaleza y Clima
  { name: "trees", icon: Trees, label: "Naturaleza", category: "Naturaleza" },
  { name: "flower", icon: Flower, label: "Flores", category: "Naturaleza" },
  { name: "leaf", icon: Leaf, label: "Plantas", category: "Naturaleza" },
  { name: "sun", icon: Sun, label: "Sol", category: "Naturaleza" },
  { name: "moon", icon: Moon, label: "Luna", category: "Naturaleza" },
  { name: "snowflake", icon: Snowflake, label: "Nieve", category: "Naturaleza" },
  { name: "mountain", icon: Mountain, label: "Montaña", category: "Naturaleza" },
  { name: "earth", icon: Earth, label: "Planeta", category: "Naturaleza" },
  
  // Premios y Logros
  { name: "award", icon: Award, label: "Premio", category: "Logros" },
  { name: "medal", icon: Medal, label: "Medalla", category: "Logros" },
  { name: "crown", icon: Crown, label: "Corona", category: "Logros" },
  { name: "star", icon: Star, label: "Estrella", category: "Logros" },
  { name: "target", icon: Target, label: "Objetivo", category: "Logros" },
  
  // Otros
  { name: "tag", icon: Tag, label: "General", category: "Otros" },
  { name: "more-horizontal", icon: MoreHorizontal, label: "Otros", category: "Otros" },
  { name: "circle", icon: Circle, label: "Círculo", category: "Otros" },
  { name: "user", icon: User, label: "Usuario", category: "Otros" },
  { name: "eye", icon: Eye, label: "Vista", category: "Otros" },
  { name: "watch", icon: Watch, label: "Reloj", category: "Otros" },
  { name: "calendar", icon: Calendar, label: "Calendario", category: "Otros" },
  { name: "map", icon: Map, label: "Mapa", category: "Otros" },
  { name: "compass", icon: Compass, label: "Brújula", category: "Otros" },
  { name: "anchor", icon: Anchor, label: "Ancla", category: "Otros" },
  { name: "rocket", icon: Rocket, label: "Cohete", category: "Otros" },
  { name: "diamond", icon: Diamond, label: "Diamante", category: "Otros" },
]

// Helper para obtener el componente de ícono
const getIconComponent = (iconName: string) => {
  const iconData = availableIcons.find((icon) => icon.name === iconName)
  return iconData ? iconData.icon : Tag
}

export function CategoryModal({ isOpen, category, defaultType, onClose, onSave }: CategoryModalProps) {
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

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (eventOrFile: React.ChangeEvent<HTMLInputElement> | File) => {
    let file: File | null = null
    
    if (eventOrFile instanceof File) {
      file = eventOrFile
    } else {
      file = eventOrFile.target.files?.[0] || null
    }
    
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona una imagen válida')
        return
      }

      // Validar tamaño de archivo (máx. 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen es muy grande. El tamaño máximo es 2MB')
        return
      }

      // Crear URL para mostrar la imagen
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{category ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
          <DialogDescription>
            {category ? "Modifica los datos de tu categoría" : "Crea una nueva categoría para organizar tus finanzas"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de categoría */}
          {!category && (
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
          )}

          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la categoría *</Label>
            <Input
              id="name"
              placeholder="Ej: Alimentación, Sueldo, etc."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Color Picker - Solo visible cuando NO hay imagen personalizada */}
          {!formData.image && (
            <div className="space-y-3">
              <Label>Color de la categoría *</Label>
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
                          placeholder="#F57C00"
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
                    placeholder="#F57C00"
                    className="font-mono"
                  />
                </div>
              </div>
              {errors.color && <p className="text-sm text-destructive">{errors.color}</p>}
            </div>
          )}

          {/* Selector de Ícono */}
          <div className="space-y-3">
            <Label>Ícono de la categoría *</Label>
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

                  {/* Grid de íconos */}
                  <ScrollArea className="h-64">
                    <div className="grid grid-cols-6 gap-2 p-1">
                      {currentIcons.map((iconData) => {
                        const IconComponent = iconData.icon
                        return (
                          <Button
                            key={iconData.name}
                            type="button"
                            variant={formData.icon === iconData.name ? "default" : "outline"}
                            size="sm"
                            className="h-12 w-12 p-0"
                            onClick={() => handleIconSelect(iconData.name)}
                            title={iconData.label}
                          >
                            <IconComponent className="h-5 w-5" />
                          </Button>
                        )
                      })}
                    </div>
                  </ScrollArea>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
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
            
            {/* Opción de imagen personalizada - fuera del selector */}
            <div className="space-y-2">
              <div className="flex justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={triggerFileInput}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Subir imagen personalizada
                </Button>
                {formData.image && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, image: null }))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Formatos soportados: JPG, PNG, GIF. Máximo 2MB.
              </p>
            </div>
            
            {errors.icon && <p className="text-sm text-destructive">{errors.icon}</p>}
            </div>
          </div>

          {/* Vista previa HERMOSA */}
          <div className="p-6 bg-gradient-to-br from-muted/50 to-muted/80 rounded-xl border-2 border-dashed border-muted-foreground/20">
            <p className="text-sm font-medium text-muted-foreground mb-3">Vista previa:</p>
            <div className="flex items-center gap-4">
              {formData.image ? (
                <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg transform transition-transform hover:scale-105">
                  <img
                    src={formData.image}
                    alt="Ícono personalizado"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                (() => {
                  const IconComponent = getIconComponent(formData.icon)
                  return (
                    <div
                      className="w-12 h-12 rounded-full border-2 border-white shadow-lg flex items-center justify-center transform transition-transform hover:scale-105"
                      style={{ backgroundColor: formData.color }}
                    >
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                  )
                })()
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{formData.name || "Nombre de la categoría"}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  {formData.type === "income" ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      Categoría de Ingresos
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      Categoría de Gastos
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className={
                formData.type === "income" ? "bg-secondary hover:bg-secondary/90" : "bg-primary hover:bg-primary/90"
              }
            >
              {category ? "Actualizar" : "Crear"} Categoría
            </Button>
          </div>
        </form>
        
        {/* Input de archivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </DialogContent>
    </Dialog>
  )
}