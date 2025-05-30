"use client"

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress"
import { getSheetData } from "@/lib/googleApi";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { useRefresh } from "@/contexts/RefreshContext";

// Define props interface
interface BudgetProgressProps {
  spreadsheetId: string;
  accessToken: string;
}

type Budget = {
  category: string
  limit: number
  spent: number
}

// Accept props
export function BudgetProgress({ spreadsheetId, accessToken }: BudgetProgressProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { globalRefreshKey } = useRefresh();

  useEffect(() => {
    const fetchData = async () => {
      if (!spreadsheetId || !accessToken) return;
      setIsLoading(true);
      setError(null);
      setBudgets([]); // Limpiar estado antes de fetch
      console.log('Refetch presupuestos', globalRefreshKey);
      await new Promise(res => setTimeout(res, 150));
      try {
        // Fetch budget data (e.g., from a 'Budgets' sheet)
        // Adjust range: Assuming 'Budgets!A2:C'
        const range = "Budgets!A2:C"; 
        const result = await getSheetData(accessToken, spreadsheetId, range);

        if (result && result.values) {
          // Fetch current spending (e.g., from 'Transactions') to calculate 'spent'
          // This requires combining data from multiple ranges/sheets and processing
          // const processedBudgets = processBudgetData(result.values, transactionData); // Placeholder
          
          // Using dummy data until processing is implemented
          const dummyBudgets: Budget[] = result.values.map((row: string[], index: number) => ({
            category: row[0] || `Category ${index+1}`,
            limit: parseFloat(row[1]?.replace(',', '.') || '0'),
            // 'spent' needs to be calculated based on actual transactions
            spent: parseFloat(row[2]?.replace(',', '.') || '0') * Math.random() * 1.2, // Dummy spent value
          })).filter((b: Budget) => b.limit > 0);

          setBudgets(dummyBudgets);
        } else {
          setBudgets([]);
        }
      } catch (err: any) {
        console.error("Error fetching budget data:", err);
        setError(`Failed to load budgets: ${err.message}`);
        setBudgets([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [spreadsheetId, accessToken, globalRefreshKey]);

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 p-4" role="alert" aria-live="polite">{t("error_cargando_presupuestos")}: {t(error)}</p>;
  }

  if (budgets.length === 0) {
    return <p className="text-muted-foreground p-4 text-center">{t("no_hay_presupuestos_definidos")}</p>;
  }

  return (
    <div className="space-y-4">
      {budgets.map((budget) => {
        // Ensure limit is not zero to avoid division by zero
        const percentage = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
        let statusColor = "text-emerald-600 dark:text-emerald-500";
        let progressBg = "bg-emerald-100 dark:bg-emerald-900/30";
        let indicatorColor = "bg-emerald-600 dark:bg-emerald-500";

        if (percentage > 80 && percentage < 100) {
          statusColor = "text-amber-600 dark:text-amber-500";
          progressBg = "bg-amber-100 dark:bg-amber-900/30";
          indicatorColor = "bg-amber-600 dark:bg-amber-500";
        } else if (percentage >= 100) {
          statusColor = "text-rose-600 dark:text-rose-500";
          progressBg = "bg-rose-100 dark:bg-rose-900/30";
          indicatorColor = "bg-rose-600 dark:bg-rose-500";
        }

        return (
          <div key={budget.category} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{budget.category}</p>
              <p className={`text-sm font-medium ${statusColor}`}>
                ${budget.spent.toLocaleString("es-ES", { minimumFractionDigits: 2 })} / ${budget.limit.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Progress
              value={Math.min(percentage, 100)} // Cap value at 100 for progress bar
              className={`h-2 ${progressBg}`}
              indicatorClassName={indicatorColor}
            />
          </div>
        )
      })}
    </div>
  )
}
