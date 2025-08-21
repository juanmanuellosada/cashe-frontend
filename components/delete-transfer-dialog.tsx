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
import { ArrowLeftRight, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { formatCurrency } from "@/lib/format"

interface DeleteTransferDialogProps {
  isOpen: boolean
  transfer?: any
  onClose: () => void
  onConfirm: (transferId: number) => void
}

export function DeleteTransferDialog({ isOpen, transfer, onClose, onConfirm }: DeleteTransferDialogProps) {
  const handleConfirm = () => {
    if (transfer) {
      onConfirm(transfer.id)
      onClose()
    }
  }

  if (!transfer) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar transferencia?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Esta acción no se puede deshacer. Se eliminará permanentemente la transferencia.</p>

              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-accent/10 text-accent">
                    <ArrowLeftRight className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{transfer.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transfer.date), "dd/MM/yyyy", { locale: es })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Desde:</span>
                  <div className="text-right">
                    <p className="font-medium">{transfer.fromAccount}</p>
                    <p className="text-sm text-primary">
                      -{formatCurrency(transfer.fromAmount, transfer.fromCurrency)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hacia:</span>
                  <div className="text-right">
                    <p className="font-medium">{transfer.toAccount}</p>
                    <p className="text-sm text-secondary">+{formatCurrency(transfer.toAmount, transfer.toCurrency)}</p>
                  </div>
                </div>

                {transfer.fromCurrency !== transfer.toCurrency && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tasa de cambio:</span>
                    <span className="text-sm">
                      {transfer.exchangeRate} {transfer.fromCurrency}/{transfer.toCurrency}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Advertencia: Esta acción afectará los saldos de ambas cuentas
                </p>
                <p className="text-sm text-destructive/80 mt-1">
                  Los saldos de "{transfer.fromAccount}" y "{transfer.toAccount}" serán ajustados automáticamente.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-destructive hover:bg-destructive/90">
            Eliminar Transferencia
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
