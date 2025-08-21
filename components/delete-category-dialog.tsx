"use client"

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
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/format"

interface DeleteCategoryDialogProps {
  isOpen: boolean
  category?: any
  onClose: () => void
  onConfirm: (categoryId: number, type: string) => void
}

export function DeleteCategoryDialog({ isOpen, category, onClose, onConfirm }: DeleteCategoryDialogProps) {
  const handleConfirm = () => {
    if (category) {
      onConfirm(category.id, category.type)
      onClose()
    }
  }

  if (!category) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Esta acción no se puede deshacer. Se eliminará permanentemente la categoría.</p>

              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {category.type === "income" ? "Ingreso" : "Gasto"}
                      </Badge>
                      {category.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Por defecto
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Transacciones:</span>
                  <span className="font-medium">{category.transactionCount}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monto total:</span>
                  <span className="font-medium">{formatCurrency(category.totalAmount, "ARS")}</span>
                </div>
              </div>

              {category.transactionCount > 0 && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ Advertencia: Esta categoría tiene {category.transactionCount} transacciones asociadas
                  </p>
                  <p className="text-sm text-destructive/80 mt-1">
                    Las transacciones existentes quedarán sin categoría y deberás reasignarlas manualmente.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-destructive hover:bg-destructive/90">
            Eliminar Categoría
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
