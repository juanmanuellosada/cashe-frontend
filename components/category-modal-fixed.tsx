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
import { modalVariants, formVariants, formItemVariants } from "@/lib/animations"
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Upload,
  X,
  // Iconos principales
  Tag,
  Home,
  Car,
  Utensils,
  ShoppingBag,
  Gamepad2,
  Plane,
  GraduationCap,
  Heart,
  Coffee,
} from "lucide-react"

const availableIcons = [
  { name: "tag", icon: Tag, label: "Etiqueta", category: "General" },
  { name: "home", icon: Home, label: "Casa", category: "Vivienda" },
  { name: "car", icon: Car, label: "Transporte", category: "Transporte" },
  { name: "utensils", icon: Utensils, label: "Comida", category: "Alimentación" },
  { name: "shopping-bag", icon: ShoppingBag, label: "Compras", category: "Compras" },
  { name: "gamepad-2", icon: Gamepad2, label: "Entretenimiento", category: "Entretenimiento" },
  { name: "plane", icon: Plane, label: "Viajes", category: "Viajes" },
  { name: "graduation-cap", icon: GraduationCap, label: "Educación", category: "Educación" },
  { name: "heart", icon: Heart, label: "Salud", category: "Salud" },
  { name: "coffee", icon: Coffee, label: "Café", category: "Alimentación" },
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
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <DialogHeader>
                <DialogTitle>{category ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
                <DialogDescription>
                  {category ? "Modifica los datos de tu categoría" : "Crea una nueva categoría para organizar tus finanzas"}
                </DialogDescription>
              </DialogHeader>

              <motion.form
                onSubmit={handleSubmit}
                className="space-y-6"
                variants={formVariants}
                initial="initial"
                animate="animate"
              >
                {/* Tipo de categoría */}
                {!category && (
                  <motion.div variants={formItemVariants}>
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
                <motion.div variants={formItemVariants} className="space-y-2">
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
                      <PopoverContent className="w-96" align="start">
                        <div className="space-y-4">
                          <div className="grid grid-cols-6 gap-2">
                            {availableIcons.map((iconData) => (
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
                        </div>
                      </PopoverContent>
                    </Popover>
                    {errors.icon && <p className="text-sm text-destructive">{errors.icon}</p>}
                  </div>
                </motion.div>

                {/* Botones */}
                <motion.div variants={formItemVariants} className="flex justify-end gap-3 pt-4">
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
