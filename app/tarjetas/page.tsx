import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, Plus } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useEffect, useState } from "react"
import { useGoogleApi } from "@/hooks/useGoogleApi"
import { getSheetData } from "@/lib/googleApi"
import { AddCardForm } from "@/components/AddCardForm"
import { EditCardForm } from "@/components/EditCardForm"
import { DeleteCardButton } from "@/components/DeleteCardButton"

export default function TarjetasPage() {
  const { spreadsheetId, accessToken, isLoading, error } = useGoogleApi();
  const [cards, setCards] = useState<any[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchCards = async () => {
      if (!spreadsheetId || !accessToken) return;
      setLoadingCards(true);
      setCardsError(null);
      try {
        // Leer datos desde la hoja 'Cards', asumiendo encabezados en A1 y datos en A2:H
        const range = "Cards!A2:H";
        const data = await getSheetData(accessToken, spreadsheetId, range);
        if (data && data.values) {
          const cardsList = data.values.map((row: string[], idx: number) => ({
            name: row[0] || "",
            bank: row[1] || "",
            lastDigits: row[2] || "",
            limit: parseFloat(row[3] || "0"),
            balance: parseFloat(row[4] || "0"),
            dueDate: row[5] || "",
            daysLeft: parseInt(row[6] || "0"),
            id: row[7] || `card-${idx}`,
          }));
          setCards(cardsList);
        } else {
          setCards([]);
        }
      } catch (err: any) {
        setCardsError(err.message || "Error al cargar tarjetas");
      } finally {
        setLoadingCards(false);
      }
    };
    fetchCards();
  }, [spreadsheetId, accessToken, refreshKey]);

  // Funciones para actualizar el estado localmente
  const handleCardAdded = (newCard: any) => {
    setCards((prev: any[]) => [...prev, newCard]);
    setRefreshKey(k => k + 1);
  };
  const handleCardUpdated = (updatedCard: any) => {
    setCards((prev: any[]) => prev.map(card => card.id === updatedCard.id ? updatedCard : card));
    setRefreshKey(k => k + 1);
  };
  const handleCardDeleted = (deletedId: string) => {
    setCards((prev: any[]) => prev.filter(card => card.id !== deletedId));
    setRefreshKey(k => k + 1);
  };

  if (isLoading || loadingCards) {
    return <div className="p-4">Cargando tarjetas...</div>;
  }
  if (error || cardsError) {
    return <div className="p-4 text-red-600">Error: {error || cardsError}</div>;
  }
  if (!spreadsheetId || !accessToken) {
    return <div className="p-4">Inicializando hoja de cálculo...</div>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold tracking-tight">Tarjetas</h1>
          <AddCardForm onCardAdded={handleCardAdded} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {cards.map((card) => {
            const usagePercentage = card.limit > 0 ? (card.balance / card.limit) * 100 : 0;
            let statusColor = "text-emerald-600 dark:text-emerald-500";
            let bgColor = "bg-emerald-100 dark:bg-emerald-900/30";

            if (usagePercentage > 50 && usagePercentage < 75) {
              statusColor = "text-amber-600 dark:text-amber-500";
              bgColor = "bg-amber-100 dark:bg-amber-900/30";
            } else if (usagePercentage >= 75) {
              statusColor = "text-rose-600 dark:text-rose-500";
              bgColor = "bg-rose-100 dark:bg-rose-900/30";
            }

            return (
              <Card key={card.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-primary/10 p-2 text-primary">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-lg">{card.name}</CardTitle>
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">**** {card.lastDigits}</div>
                  </div>
                  <CardDescription>{card.bank}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-medium">Saldo actual</p>
                      <p className={`text-sm font-medium ${statusColor}`}>
                        ${card.balance.toLocaleString("es-ES", { minimumFractionDigits: 2 })} / $
                        {card.limit.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <Progress value={usagePercentage} className={`h-2 ${bgColor}`} />
                  </div>

                  <div className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Próximo pago</p>
                      <p className="text-sm font-medium">
                        ${card.balance.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Fecha de vencimiento</p>
                      <p
                        className={`text-xs ${
                          card.daysLeft <= 3
                            ? "text-rose-600 dark:text-rose-500"
                            : card.daysLeft <= 7
                              ? "text-amber-600 dark:text-amber-500"
                              : "text-muted-foreground"
                        }`}
                      >
                        {card.dueDate} ({card.daysLeft} días)
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-0">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Plus className="h-3 w-3" />
                    <span>Transacción</span>
                  </Button>
                  <div className="flex gap-2">
                    <EditCardForm card={card} onCardUpdated={handleCardUpdated} />
                    <DeleteCardButton cardId={card.id} onCardDeleted={() => handleCardDeleted(card.id)} />
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
