"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getSheetData } from "@/lib/googleApi" // Added
import { Skeleton } from "@/components/ui/skeleton" // Added
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns" // Added
import { es } from "date-fns/locale" // Added locale
import { useRefresh } from "@/contexts/RefreshContext";

// Define props interface
interface CalendarViewProps {
  spreadsheetId: string;
  accessToken: string;
}

export function CalendarView({ spreadsheetId, accessToken }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [expensesByDay, setExpensesByDay] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { globalRefreshKey } = useRefresh();

  useEffect(() => {
    const fetchData = async () => {
      if (!spreadsheetId || !accessToken) return;
      setIsLoading(true);
      setError(null);
      setExpensesByDay({}); // Limpiar estado antes de fetch
      console.log('Refetch calendar', globalRefreshKey);
      await new Promise(res => setTimeout(res, 1000));
      try {
        // Get transaction data for the current month
        const range = "Transactions!A2:E"; // Assuming columns: Date, Type, Description, Category, Amount
        const result = await getSheetData(accessToken, spreadsheetId, range);
        
        if (result && result.values) {
          const monthStart = startOfMonth(currentMonth);
          const monthEnd = endOfMonth(currentMonth);
          const interval = { start: monthStart, end: monthEnd };
          
          // Process transactions to get expenses by day
          const expenses: Record<string, number> = {};
          
          result.values.forEach((row: string[]) => {
            try {
              const dateStr = row[0]; // Date column (YYYY-MM-DD format)
              const type = (row[1] || "").toLowerCase(); // Type column (should be 'expense')
              const amount = parseFloat((row[4] || "0").replace(',', '.')); // Amount column
              
              // Skip invalid or non-expense entries
              if (!dateStr || type !== 'expense' || isNaN(amount)) return;
              
              const transactionDate = parseISO(dateStr);
              
              // Skip if not within current month
              if (!isWithinInterval(transactionDate, interval)) return;
              
              // Format as YYYY-MM-DD to use as key
              const dateKey = format(transactionDate, "yyyy-MM-dd");
              
              // Add to the running total for this day
              expenses[dateKey] = (expenses[dateKey] || 0) + amount;
            } catch (e) {
              console.warn("Error processing transaction row", e);
            }
          });
          
          setExpensesByDay(expenses);
        } else {
          setExpensesByDay({});
        }
      } catch (err: any) {
        console.error("Error fetching calendar data:", err);
        setError(`Failed to load expense data: ${err.message}`);
        setExpensesByDay({});
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [spreadsheetId, accessToken, currentMonth, globalRefreshKey]); // Agrega globalRefreshKey

  // Helper functions
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const getExpenseLevel = (amount: number) => {
    if (amount === 0) return "none"
    if (amount < 50) return "low"
    if (amount < 100) return "medium"
    return "high"
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDayOfMonth = getFirstDayOfMonth(year, month)

  const monthName = currentMonth.toLocaleString("es-ES", { month: "long" })

  const days = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null) // Días vacíos al inicio
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-20" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 p-4">Error loading calendar: {error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium capitalize">
          {monthName} {year}
        </h3>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
          <div key={day} className="text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="h-10" />
          }

          const dateKey = formatDateKey(year, month, day)
          const expense = expensesByDay[dateKey] || 0
          const expenseLevel = getExpenseLevel(expense)

          return (
            <div
              key={dateKey}
              className={cn("flex h-10 flex-col items-center justify-center rounded-md text-sm", {
                "bg-primary/5": expenseLevel === "none",
                "bg-emerald-100 dark:bg-emerald-900/30": expenseLevel === "low",
                "bg-amber-100 dark:bg-amber-900/30": expenseLevel === "medium",
                "bg-rose-100 dark:bg-rose-900/30": expenseLevel === "high",
              })}
            >
              <span>{day}</span>
              {expense > 0 && <span className="text-xs font-medium">${expense.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
