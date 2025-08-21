"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface Category {
  id: string
  name: string
  type: "income" | "expense"
  color: string
  icon: string
  image?: string
}

interface CategoriesContextType {
  categories: Category[]
  addCategory: (category: Omit<Category, 'id'>) => void
  updateCategory: (id: string, category: Partial<Category>) => void
  deleteCategory: (id: string) => void
  getCategoriesByType: (type: "income" | "expense") => Category[]
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined)

// Categorías por defecto
const defaultCategories: Category[] = [
  // Ingresos
  { id: "income-1", name: "Sueldo", type: "income", color: "#43A047", icon: "briefcase" },
  { id: "income-2", name: "Freelance", type: "income", color: "#81C784", icon: "laptop" },
  { id: "income-3", name: "Inversiones", type: "income", color: "#4CAF50", icon: "trending-up" },
  { id: "income-4", name: "Otros", type: "income", color: "#A5D6A7", icon: "more-horizontal" },
  
  // Gastos
  { id: "expense-1", name: "Alimentación", type: "expense", color: "#F57C00", icon: "utensils" },
  { id: "expense-2", name: "Transporte", type: "expense", color: "#FF9800", icon: "car" },
  { id: "expense-3", name: "Entretenimiento", type: "expense", color: "#FFB74D", icon: "gamepad-2" },
  { id: "expense-4", name: "Servicios", type: "expense", color: "#FFCC02", icon: "zap" },
  { id: "expense-5", name: "Salud", type: "expense", color: "#FFA726", icon: "heart" },
  { id: "expense-6", name: "Otros", type: "expense", color: "#FFAB91", icon: "more-horizontal" },
]

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])

  // Cargar categorías del localStorage al inicializar
  useEffect(() => {
    const savedCategories = localStorage.getItem("cashe-categories")
    if (savedCategories) {
      try {
        const parsed = JSON.parse(savedCategories)
        setCategories(parsed)
      } catch (error) {
        console.error("Error parsing saved categories:", error)
        setCategories(defaultCategories)
        localStorage.setItem("cashe-categories", JSON.stringify(defaultCategories))
      }
    } else {
      setCategories(defaultCategories)
      localStorage.setItem("cashe-categories", JSON.stringify(defaultCategories))
    }
  }, [])

  // Guardar categorías en localStorage cuando cambien
  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem("cashe-categories", JSON.stringify(categories))
    }
  }, [categories])

  const addCategory = (categoryData: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...categoryData,
      id: `${categoryData.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
    
    setCategories(prev => [...prev, newCategory])
    console.log("Categoría agregada:", newCategory)
  }

  const updateCategory = (id: string, categoryData: Partial<Category>) => {
    setCategories(prev => 
      prev.map(cat => cat.id === id ? { ...cat, ...categoryData } : cat)
    )
  }

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id))
  }

  const getCategoriesByType = (type: "income" | "expense") => {
    return categories.filter(cat => cat.type === type)
  }

  return (
    <CategoriesContext.Provider value={{
      categories,
      addCategory,
      updateCategory,
      deleteCategory,
      getCategoriesByType
    }}>
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories() {
  const context = useContext(CategoriesContext)
  if (context === undefined) {
    throw new Error("useCategories must be used within a CategoriesProvider")
  }
  return context
}
