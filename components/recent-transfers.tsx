"use client"

import { ArrowRightLeft, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState, useEffect } from "react"
import { useGoogleApi } from "@/hooks/useGoogleApi"
import { getSheetData } from "@/lib/googleApi"
import { EditTransferForm } from "./EditTransferForm"
import { DeleteTransferButton } from "./DeleteTransferButton"

type Transfer = {
  id: string
  date: string
  fromAccount: string
  toAccount: string
  amount: number
  notes: string
}

export function RecentTransfers({ onTransferAdded }: {
  onTransferAdded?: (newTransfer: any) => void;
} = {}) {
  const [searchQuery, setSearchQuery] = useState("")
  const { spreadsheetId, accessToken, isLoading, error } = useGoogleApi();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [transfersError, setTransfersError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransfers = async () => {
      if (!spreadsheetId || !accessToken) return;
      setLoadingTransfers(true);
      setTransfersError(null);
      try {
        // Leer datos desde la hoja 'Transfers', asumiendo encabezados en A1 y datos en A2:F
        const range = "Transfers!A2:F";
        const data = await getSheetData(accessToken, spreadsheetId, range);
        if (data && data.values) {
          const transfersList = data.values.map((row: string[], idx: number) => ({
            date: row[0] || "",
            fromAccount: row[1] || "",
            toAccount: row[2] || "",
            amount: parseFloat(row[3] || "0"),
            id: row[4] || `transfer-${idx}`,
            notes: row[5] || "",
          }));
          setTransfers(transfersList);
        } else {
          setTransfers([]);
        }
      } catch (err: any) {
        setTransfersError(err.message || "Error al cargar transferencias");
      } finally {
        setLoadingTransfers(false);
      }
    };
    fetchTransfers();
  }, [spreadsheetId, accessToken]);

  // Funciones para actualizar el estado localmente
  const handleTransferAdded = (newTransfer: any) => {
    setTransfers((prev: any[]) => [...prev, newTransfer]);
    if (onTransferAdded) onTransferAdded(newTransfer);
  };
  const handleTransferUpdated = (updatedTransfer: any) => {
    setTransfers((prev: any[]) => prev.map(t => t.id === updatedTransfer.id ? updatedTransfer : t));
  };
  const handleTransferDeleted = (deletedId: string) => {
    setTransfers((prev: any[]) => prev.filter(t => t.id !== deletedId));
  };

  if (isLoading || loadingTransfers) {
    return <div className="p-4">Cargando transferencias...</div>;
  }
  if (error || transfersError) {
    return <div className="p-4 text-red-600">Error: {error || transfersError}</div>;
  }
  if (!spreadsheetId || !accessToken) {
    return <div className="p-4">Inicializando hoja de cálculo...</div>;
  }

  const filteredTransfers = transfers.filter(
    (transfer) =>
      transfer.fromAccount.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transfer.toAccount.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar transferencias..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {filteredTransfers.map((transfer) => (
            <div
              key={transfer.id}
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <ArrowRightLeft className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">
                    {transfer.fromAccount} → {transfer.toAccount}
                  </p>
                  <p className="text-xs text-muted-foreground">{transfer.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-medium">${transfer.amount.toLocaleString("es-ES", { minimumFractionDigits: 2 })}</p>
                <EditTransferForm transfer={transfer} onTransferUpdated={handleTransferUpdated} />
                <DeleteTransferButton transferId={transfer.id} onTransferDeleted={() => handleTransferDeleted(transfer.id)} />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
