"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Search,
  Edit,
  Trash2,
  Plus,
  Tag,
  TrendingUp,
  TrendingDown,
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
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DeleteCategoryDialog } from "@/components/delete-category-dialog"
import { CategoryModal } from "@/components/category-modal"
import { formatCurrency } from "@/lib/format"

// Helper para obtener el componente de ícono
const getIconComponent = (iconName: string) => {
  const icons = {
    briefcase: Briefcase,
    laptop: Laptop,
    "trending-up": TrendingUp,
    clock: Clock,
    plus: Plus,
    utensils: Utensils,
    car: Car,
    "gamepad-2": Gamepad2,
    zap: Zap,
    heart: Heart,
    "graduation-cap": GraduationCap,
    "more-horizontal": MoreHorizontal,
  }
  return icons[iconName as keyof typeof icons] || Tag
}

// Datos de ejemplo de categorías
const initialCategories = {
  income: [
    { id: 1, name: "Sueldo", color: "#43A047", icon: "briefcase", image: null, transactionCount: 12, totalAmount: 540000 },
    { id: 2, name: "Freelance", color: "#81C784", icon: "laptop", image: null, transactionCount: 8, totalAmount: 64000 },
    { id: 3, name: "Inversiones", color: "#4CAF50", icon: "trending-up", image: null, transactionCount: 3, totalAmount: 15000 },
    { id: 4, name: "Trabajo Extra", color: "#66BB6A", icon: "clock", image: null, transactionCount: 5, totalAmount: 25000 },
    { id: 5, name: "Otros", color: "#A5D6A7", icon: "plus", image: null, transactionCount: 2, totalAmount: 3000 },
  ],
  expense: [
    { id: 6, name: "Alimentación", color: "#F57C00", icon: "utensils", image: null, transactionCount: 45, totalAmount: 135000 },
    { id: 7, name: "Transporte", color: "#FF9800", icon: "car", image: null, transactionCount: 28, totalAmount: 84000 },
    { id: 8, name: "Entretenimiento", color: "#FFB74D", icon: "gamepad-2", image: null, transactionCount: 15, totalAmount: 45000 },
    { id: 9, name: "Servicios", color: "#FFCC02", icon: "zap", image: null, transactionCount: 12, totalAmount: 48000 },
    { id: 10, name: "Salud", color: "#FFA726", icon: "heart", image: null, transactionCount: 8, totalAmount: 24000 },
    { id: 11, name: "Educación", color: "#FF8A65", icon: "graduation-cap", image: null, transactionCount: 4, totalAmount: 16000 },
    { id: 12, name: "Otros", color: "#FFAB91", icon: "more-horizontal", image: null, transactionCount: 6, totalAmount: 18000 },
  ],
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState(initialCategories)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("income")
  const [categoryModal, setCategoryModal] = useState<{ isOpen: boolean; category?: any; type?: string }>({
    isOpen: false,
  })
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; category?: any }>({ isOpen: false })

  const filteredCategories = categories[activeTab as keyof typeof categories].filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalIncomeCategories = categories.income.length
  const totalExpenseCategories = categories.expense.length
  const totalCategories = totalIncomeCategories + totalExpenseCategories

  const handleCreateCategory = (categoryData: any) => {
    try {
      const newCategory = {
        id: Math.max(...[...categories.income, ...categories.expense].map((c) => c.id)) + 1,
        ...categoryData,
        transactionCount: 0,
        totalAmount: 0,
      }

      setCategories({
        ...categories,
        [categoryData.type]: [...categories[categoryData.type as keyof typeof categories], newCategory],
      })
      
      // Mostrar notificación de éxito
      const categoryType = categoryData.type === 'income' ? 'ingresos' : 'gastos'
      toast.success("Categoría creada exitosamente", {
        description: `${categoryData.name} - Tipo: ${categoryType}`,
      })
    } catch (error) {
      toast.error("Error al crear la categoría", {
        description: "Hubo un problema al guardar la categoría. Inténtalo de nuevo.",
      })
    }
  }

  const handleEditCategory = (categoryData: any) => {
    try {
      const type = categoryData.type
      setCategories({
        ...categories,
        [type]: categories[type as keyof typeof categories].map((cat) =>
          cat.id === categoryData.id ? { ...cat, ...categoryData } : cat,
        ),
      })
      
      // Mostrar notificación de éxito
      toast.success("Categoría actualizada exitosamente", {
        description: `${categoryData.name} ha sido modificada`,
      })
    } catch (error) {
      toast.error("Error al actualizar la categoría", {
        description: "Hubo un problema al actualizar la categoría. Inténtalo de nuevo.",
      })
    }
  }

  const handleDeleteCategory = (categoryId: number, type: string) => {
    try {
      const category = categories[type as keyof typeof categories].find(cat => cat.id === categoryId)
      setCategories({
        ...categories,
        [type]: categories[type as keyof typeof categories].filter((cat) => cat.id !== categoryId),
      })
      
      // Mostrar notificación de éxito
      toast.success("Categoría eliminada exitosamente", {
        description: category ? `${category.name} ha sido eliminada` : "La categoría ha sido eliminada",
      })
    } catch (error) {
      toast.error("Error al eliminar la categoría", {
        description: "Hubo un problema al eliminar la categoría. Inténtalo de nuevo.",
      })
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-space-grotesk">Categorías</h1>
            <p className="text-muted-foreground">Organiza tus ingresos y gastos por categorías</p>
          </div>
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
              onClick={() => setCategoryModal({ isOpen: true, type: activeTab })}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Categoría
            </Button>
          </motion.div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categorías de Ingresos</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{totalIncomeCategories}</div>
              <p className="text-xs text-muted-foreground">Categorías disponibles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categorías de Gastos</CardTitle>
              <TrendingDown className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalExpenseCategories}</div>
              <p className="text-xs text-muted-foreground">Categorías disponibles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Categorías</CardTitle>
              <Tag className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{totalCategories}</div>
              <p className="text-xs text-muted-foreground">Todas las categorías</p>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Buscar Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar categorías..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs y lista de categorías */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gestión de Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="income" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Ingresos ({categories.income.length})
                </TabsTrigger>
                <TabsTrigger value="expense" className="gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Gastos ({categories.expense.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="income" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCategories.map((category) => {
                    const IconComponent = getIconComponent(category.icon)
                    return (
                      <div
                        key={category.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {category.image ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm flex-shrink-0">
                              <img
                                src={category.image}
                                alt={`Ícono de ${category.name}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: category.color }}
                            >
                              <IconComponent className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{category.name}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                              <span className="flex-shrink-0">{category.transactionCount} transacciones</span>
                              <span className="flex-shrink-0">{formatCurrency(category.totalAmount, "ARS")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 justify-end flex-shrink-0">
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
                              variant="ghost"
                              size="sm"
                              onClick={() => setCategoryModal({ isOpen: true, category: { ...category, type: "income" } })}
                            >
                              <Edit className="h-4 w-4" />
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
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteDialog({ isOpen: true, category: { ...category, type: "income" } })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>

              <TabsContent value="expense" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCategories.map((category) => {
                    const IconComponent = getIconComponent(category.icon)
                    return (
                      <div
                        key={category.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {category.image ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm flex-shrink-0">
                              <img
                                src={category.image}
                                alt={`Ícono de ${category.name}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: category.color }}
                            >
                              <IconComponent className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{category.name}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                              <span className="flex-shrink-0">{category.transactionCount} transacciones</span>
                              <span className="flex-shrink-0">{formatCurrency(category.totalAmount, "ARS")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 justify-end flex-shrink-0">
                          <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 40,
        duration: 0.15,
      }}
    >
      <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCategoryModal({ isOpen: true, category: { ...category, type: "expense" } })}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
    </motion.div>
                          <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 40,
        duration: 0.15,
      }}
    >
      <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteDialog({ isOpen: true, category: { ...category, type: "expense" } })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
    </motion.div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>
            </Tabs>

            {filteredCategories.length === 0 && (
              <div className="text-center py-12">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Tag className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No se encontraron categorías</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "Intenta con otros términos de búsqueda" : "Crea tu primera categoría personalizada"}
                </p>
                {!searchTerm && (
                  <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 40,
        duration: 0.15,
      }}
    >
      <Button onClick={() => setCategoryModal({ isOpen: true, type: activeTab })}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Categoría
                  </Button>
    </motion.div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modales */}
      <CategoryModal
        isOpen={categoryModal.isOpen}
        category={categoryModal.category}
        defaultType={categoryModal.type}
        onClose={() => setCategoryModal({ isOpen: false })}
        onSave={categoryModal.category ? handleEditCategory : handleCreateCategory}
      />

      <DeleteCategoryDialog
        isOpen={deleteDialog.isOpen}
        category={deleteDialog.category}
        onClose={() => setDeleteDialog({ isOpen: false })}
        onConfirm={handleDeleteCategory}
      />
    </DashboardLayout>
  )
}
