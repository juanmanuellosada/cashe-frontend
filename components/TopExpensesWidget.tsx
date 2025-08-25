"use client"
// Formateador consistente para evitar hydration mismatch
function formatNumber(num: number) {
  return num.toLocaleString('es-AR', { minimumFractionDigits: 0 })
}
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingDown } from "lucide-react"

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  categoryColor?: string
}

interface TopExpensesWidgetProps {
  expenses: Expense[]
  dateRange?: { from?: Date; to?: Date }
  className?: string
}

// Colores para categorías
const categoryColors: Record<string, string> = {
  "Alimentación": "#ef4444",
  "Transporte": "#3b82f6", 
  "Entretenimiento": "#8b5cf6",
  "Salud": "#10b981",
  "Educación": "#f59e0b",
  "Hogar": "#6b7280",
  "Ropa": "#ec4899",
  "Tecnología": "#06b6d4",
  "Viajes": "#84cc16",
  "Otros": "#64748b"
}

export function TopExpensesWidget({ expenses, dateRange, className }: TopExpensesWidgetProps) {
  // Filtrar gastos por rango de fechas
  const filteredExpenses = React.useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return expenses

    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date)
      return expenseDate >= dateRange.from! && expenseDate <= dateRange.to!
    })
  }, [expenses, dateRange])

  // Obtener los 5 gastos más grandes
  const topExpenses = React.useMemo(() => {
    return filteredExpenses
      .filter(expense => expense.amount < 0) // Solo gastos (negativos)
      .sort((a, b) => a.amount - b.amount) // Ordenar de menor a mayor (más negativo primero)
      .slice(0, 5)
      .map(expense => ({
        ...expense,
        amount: Math.abs(expense.amount), // Convertir a positivo para mostrar
        categoryColor: categoryColors[expense.category] || categoryColors["Otros"]
      }))
  }, [filteredExpenses])

  const maxAmount = topExpenses.length > 0 ? topExpenses[0].amount : 1

  if (topExpenses.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Top 5 Gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No hay gastos en el período seleccionado
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-500" />
          Top 5 Gastos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topExpenses.map((expense, index) => {
            const percentage = (expense.amount / maxAmount) * 100
            
            return (
              <div key={expense.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Ranking badge */}
                    <Badge 
                      variant="secondary" 
                      className="w-6 h-6 p-0 flex items-center justify-center text-xs font-bold shrink-0"
                    >
                      {index + 1}
                    </Badge>
                    
                    {/* Category indicator */}
                    <div 
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: expense.categoryColor }}
                    />
                    
                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {expense.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {expense.category}
                      </p>
                    </div>
                  </div>
                  
                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-red-600">
                      -${formatNumber(expense.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {percentage.toFixed(0)}%
                    </p>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: expense.categoryColor 
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Summary */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Total top 5 gastos:
            </span>
            <span className="text-sm font-bold text-red-600">
              -${formatNumber(topExpenses.reduce((sum, expense) => sum + expense.amount, 0))}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
