"use client"

import type React from "react"
import { useEffect, useState } from "react"; // Import useEffect and useState
import { ArrowUp, Coffee, Home, ShoppingBag, Utensils, Car, Search, LucideIcon, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getSheetData } from "@/lib/googleApi"; // Import API helper
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { format, parseISO } from 'date-fns'; // Import date-fns for parsing/formatting
import { es } from 'date-fns/locale';
import { EditTransactionForm } from "./EditTransactionForm";
import { DeleteTransactionButton } from "./DeleteTransactionButton";
import { useTranslation } from "react-i18next";

// Define props interface
interface RecentTransactionsProps {
  spreadsheetId: string;
  accessToken: string;
  onTransactionAdded?: (newTransaction: any) => void;
  refreshKey?: number;
}

type Transaction = {
  id: string // Use row index or generate unique ID if needed
  date: string // Keep as string for display
  description: string
  category: string
  amount: number
  type: "income" | "expense"
  icon: LucideIcon // Use LucideIcon type
}

// Helper to map category names to icons (customize as needed)
const categoryIcons: { [key: string]: LucideIcon } = {
  Alimentación: ShoppingBag,
  Transporte: Car,
  Ocio: Coffee, // Example
  Vivienda: Home,
  Salud: AlertCircle, // Example
  Servicios: AlertCircle, // Example
  Educación: AlertCircle, // Example
  Ropa: ShoppingBag,
  Regalos: AlertCircle, // Example
  Otros: AlertCircle, // Example
  Salario: ArrowUp,
  Freelance: ArrowUp,
  Inversiones: ArrowUp,
  Reembolsos: ArrowUp,
  Restaurantes: Utensils,
  Cafetería: Coffee,
  default: AlertCircle, // Default icon
};

const getIconForCategory = (category: string): LucideIcon => {
  return categoryIcons[category] || categoryIcons.default;
};

export function RecentTransactions({ spreadsheetId, accessToken, onTransactionAdded, refreshKey }: RecentTransactionsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  // Funciones para actualizar el estado localmente
  const handleTransactionAdded = (newTransaction: any) => {
    setTransactions((prev: any[]) => [...prev, newTransaction]);
    if (onTransactionAdded) onTransactionAdded(newTransaction);
  };
  const handleTransactionUpdated = (updatedTransaction: any) => {
    setTransactions((prev: any[]) => prev.map(tx => tx.id === updatedTransaction.id ? updatedTransaction : tx));
  };
  const handleTransactionDeleted = (deletedId: string) => {
    setTransactions((prev: any[]) => prev.filter(tx => tx.id !== deletedId));
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!spreadsheetId || !accessToken) return;
      setIsLoading(true);
      setError(null);
      setTransactions([]); // Limpiar estado antes de fetch
      console.log('Refetch transacciones', refreshKey);
      await new Promise(res => setTimeout(res, 1000));
      try {
        const range = "Transactions!A2:F100";
        const result = await getSheetData(accessToken, spreadsheetId, range);
        if (result && result.values) {
          const fetchedTransactions: Transaction[] = result.values
            .map((row: string[], index: number) => {
              if (!row[0] || !row[1] || !row[2] || !row[3] || !row[4]) {
                return null;
              }
              const dateStr = row[0];
              const type = row[1].toLowerCase() === 'income' ? 'income' : 'expense';
              const amount = parseFloat(row[4]);
              const category = row[3];
              let displayDate = dateStr;
              try {
                 const parsedDate = parseISO(dateStr);
                 displayDate = format(parsedDate, "dd MMM, yyyy", { locale: es });
              } catch (e) {
                 console.warn(`Could not parse date: ${dateStr}`);
              }
              return {
                id: `row-${index + 2}`,
                date: displayDate,
                description: row[2],
                category: category,
                amount: isNaN(amount) ? 0 : amount,
                type: type,
                icon: getIconForCategory(category),
              };
            })
            .filter((tx: Transaction | null): tx is Transaction => tx !== null)
            .sort((a: Transaction, b: Transaction) => {
              const dateA = result.values.find((r: string[], i: number) => `row-${i+2}` === a.id)?.[0] || '';
              const dateB = result.values.find((r: string[], i: number) => `row-${i+2}` === b.id)?.[0] || '';
              return dateB.localeCompare(dateA);
            })
            .slice(0, 10);
          setTransactions(fetchedTransactions);
        } else {
          setTransactions([]);
        }
      } catch (err: any) {
        console.error("Error fetching recent transactions:", err);
        setError(`Failed to load transactions: ${err.message}`);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [spreadsheetId, accessToken, refreshKey]);

  const filteredTransactions = transactions.filter(
    (transaction) =>
      transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t("buscar_transacciones")}
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label={t("buscar_transacciones")}
        />
      </div>

      <ScrollArea className="h-[300px]">
        {isLoading ? (
          <div className="space-y-2 p-1" aria-busy="true" aria-live="polite">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <p className="text-red-500 p-4" role="alert" aria-live="polite">{t("error_cargando_transacciones")}: {t(error)}</p>
        ) : filteredTransactions.length === 0 ? (
           <p className="text-muted-foreground p-4 text-center">{t("no_hay_transacciones_recentes")}</p>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-full p-2 ${
                      transaction.type === "income"
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-500"
                        : "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-500"
                    }`}
                  >
                    <transaction.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{transaction.date}</p>
                      <span className="text-xs text-muted-foreground">•</span>
                      <p className="text-xs text-muted-foreground">{transaction.category}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p
                    className={`font-medium ${
                      transaction.type === "income"
                        ? "text-emerald-600 dark:text-emerald-500"
                        : "text-rose-600 dark:text-rose-500"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}$
                    {transaction.amount.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                  </p>
                  <EditTransactionForm transaction={transaction} onTransactionUpdated={handleTransactionUpdated} />
                  <DeleteTransactionButton transactionId={transaction.id} onTransactionDeleted={() => handleTransactionDeleted(transaction.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="flex justify-center">
        <Button variant="outline" size="sm">
          {t("ver_todas_las_transacciones")}
        </Button>
      </div>
    </div>
  )
}
