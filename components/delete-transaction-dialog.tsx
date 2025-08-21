"use client"

import type React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownRight, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { formatCurrency } from "@/lib/format"

interface DeleteTransactionDialogProps {
  isOpen: boolean
  transaction?: any
  onClose: () => void
  onConfirm: (transactionId: number) => void
}

export function DeleteTransactionDialog({ isOpen, transaction, onClose, onConfirm }: DeleteTransactionDialogProps) {
  const handleConfirm = () => {
    if (transaction) {
      onConfirm(transaction.id)
      onClose()
    }
  }

  if (!transaction) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Esta acción no se puede deshacer. Se eliminará permanentemente la transacción.</p>

              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      transaction.type === "income" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {transaction.type === "income" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {transaction.category}
                      </Badge>
                      <span>•</span>
                      <span>{transaction.account}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monto:</span>
                  <span
                    className={`font-semibold ${transaction.type === "income" ? "text-secondary" : "text-primary"}`}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount, "ARS")}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Fecha:</span>
                  <span className="text-sm">{format(new Date(transaction.date), "dd/MM/yyyy", { locale: es })}</span>
                </div>
              </div>

              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Advertencia: Esta acción afectará los saldos de tus cuentas
                </p>
                <p className="text-sm text-destructive/80 mt-1">
                  El saldo de "{transaction.account}" será ajustado automáticamente.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-destructive hover:bg-destructive/90">
            Eliminar Transacción
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
