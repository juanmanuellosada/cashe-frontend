"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface Widget {
  id: string
  title: string
  component: string
  visible: boolean
  order: number
  category: 'summary' | 'charts' | 'lists' | 'actions'
}

interface DashboardContextType {
  widgets: Widget[]
  updateWidgetVisibility: (id: string, visible: boolean) => void
  updateWidgetOrder: (widgets: Widget[]) => void
  resetToDefault: () => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

const defaultWidgets: Widget[] = [
  // Summary cards
  { id: 'balance', title: 'Balance Total', component: 'BalanceCard', visible: true, order: 1, category: 'summary' },
  { id: 'income', title: 'Ingresos', component: 'IncomeCard', visible: true, order: 2, category: 'summary' },
  { id: 'expenses', title: 'Gastos', component: 'ExpensesCard', visible: true, order: 3, category: 'summary' },
  { id: 'transactions', title: 'Tasa de Ahorro', component: 'SavingsRateCard', visible: true, order: 4, category: 'summary' },
  
  // Charts
  { id: 'expenses-categories', title: 'Gastos por Categoría', component: 'ExpensesCategoriesChart', visible: true, order: 5, category: 'charts' },
  { id: 'income-categories', title: 'Ingresos por Categoría', component: 'IncomeCategoriesChart', visible: true, order: 6, category: 'charts' },
  { id: 'top-expenses', title: 'Top 5 Gastos', component: 'TopExpensesWidget', visible: true, order: 7, category: 'charts' },
  
  // Lists
  { id: 'recent-transactions', title: 'Transacciones Recientes', component: 'RecentTransactionsList', visible: true, order: 8, category: 'lists' },
]

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets)

  // Cargar configuración desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-widgets')
    if (saved) {
      try {
        const savedWidgets = JSON.parse(saved)
        setWidgets(savedWidgets)
      } catch (error) {
        console.error('Error loading dashboard configuration:', error)
      }
    }
  }, [])

  // Guardar configuración en localStorage
  useEffect(() => {
    localStorage.setItem('dashboard-widgets', JSON.stringify(widgets))
  }, [widgets])

  const updateWidgetVisibility = (id: string, visible: boolean) => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === id ? { ...widget, visible } : widget
      )
    )
  }

  const updateWidgetOrder = (newWidgets: Widget[]) => {
    setWidgets(newWidgets)
  }

  const resetToDefault = () => {
    setWidgets(defaultWidgets)
    localStorage.removeItem('dashboard-widgets')
  }

  return (
    <DashboardContext.Provider value={{
      widgets,
      updateWidgetVisibility,
      updateWidgetOrder,
      resetToDefault
    }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
