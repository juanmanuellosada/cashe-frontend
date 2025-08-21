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

interface DeleteAccountDialogProps {
  isOpen: boolean
  account?: any
  onClose: () => void
  onConfirm: (accountId: number) => void
}

export function DeleteAccountDialog({ isOpen, account, onClose, onConfirm }: DeleteAccountDialogProps) {
  const handleConfirm = () => {
    if (account) {
      onConfirm(account.id)
      onClose()
    }
  }

  if (!account) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar cuenta?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta y todos sus datos asociados.
              </p>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Cuenta:</span>
                  <span>{account.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Saldo actual:</span>
                  <span className={account.balance >= 0 ? "text-secondary" : "text-destructive"}>
                    {formatCurrency(account.balance, account.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Estado:</span>
                  <Badge variant={account.isActive ? "default" : "secondary"}>
                    {account.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
              </div>

              {account.balance !== 0 && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ Advertencia: Esta cuenta tiene un saldo de {formatCurrency(account.balance, account.currency)}
                  </p>
                  <p className="text-sm text-destructive/80 mt-1">
                    Considera transferir el saldo a otra cuenta antes de eliminarla.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-destructive hover:bg-destructive/90">
            Eliminar Cuenta
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
