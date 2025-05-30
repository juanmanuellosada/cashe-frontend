import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { TransferForm } from "@/components/transfer-form"
import { RecentTransfers } from "@/components/recent-transfers"
import { AddTransferForm } from "@/components/AddTransferForm"
import { useState } from "react"

export default function TransferenciasPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Función para agregar transferencia localmente
  const handleTransferAdded = (newTransfer: any) => {
    setTransfers((prev: any[]) => [...prev, newTransfer]);
    setRefreshKey(k => k + 1);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold tracking-tight">Transferencias</h1>
          <AddTransferForm onTransferAdded={handleTransferAdded} refreshKey={refreshKey} setRefreshKey={setRefreshKey} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Transferir dinero</CardTitle>
              <CardDescription>Mueve dinero entre tus cuentas</CardDescription>
            </CardHeader>
            <CardContent>
              <TransferForm refreshKey={refreshKey} setRefreshKey={setRefreshKey} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transferencias recientes</CardTitle>
              <CardDescription>Historial de movimientos entre cuentas</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentTransfers onTransferAdded={handleTransferAdded} refreshKey={refreshKey} setRefreshKey={setRefreshKey} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
