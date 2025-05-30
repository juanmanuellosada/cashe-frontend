"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRightLeft, Plus, Wallet } from "lucide-react"
import { useGoogleApi } from "@/hooks/useGoogleApi"
import { getSheetData } from "@/lib/googleApi"
import { AddAccountForm } from "@/components/AddAccountForm"
import { EditAccountForm } from "@/components/EditAccountForm"
import { DeleteAccountButton } from "@/components/DeleteAccountButton"
import { useRefresh } from "@/contexts/RefreshContext"

// Mapeo de tipos a iconos (puedes expandir según tus tipos de cuenta)
const accountTypeIcon: Record<string, React.ElementType> = {
  Bancaria: Wallet,
  Efectivo: Wallet,
  // Agrega más tipos si es necesario
}

export default function CuentasPage() {
  const { spreadsheetId, accessToken, isLoading, error } = useGoogleApi();
  const { globalRefreshKey } = useRefresh();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!spreadsheetId || !accessToken) return;
      setLoadingAccounts(true);
      setAccountsError(null);
      try {
        // Leer datos desde la hoja 'Accounts', asumiendo encabezados en A1 y datos en A2:H
        const range = "Accounts!A2:H";
        const data = await getSheetData(accessToken, spreadsheetId, range);
        // data.values es un array de arrays (filas)
        if (data && data.values) {
          // Mapear a objetos con claves según los encabezados
          const accountsList = data.values.map((row: string[], idx: number) => ({
            name: row[0] || "",
            type: row[1] || "",
            initialBalance: parseFloat(row[2] || "0"),
            balance: parseFloat(row[3] || "0"),
            currency: row[4] || "",
            notes: row[5] || "",
            lastUpdated: row[6] || "",
            id: row[7] || `acc-${idx}`,
            icon: accountTypeIcon[row[1]] || Wallet,
          }));
          setAccounts(accountsList);
        } else {
          setAccounts([]);
        }
      } catch (err: any) {
        setAccountsError(err.message || "Error al cargar cuentas");
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, [spreadsheetId, accessToken, globalRefreshKey]);

  // Funciones para actualizar el estado localmente
  const handleAccountAdded = (newAccount: any) => {
    // Opcional: Actualización optimista si se desea una respuesta UI inmediata
    // setAccounts((prev: any[]) => [...prev, newAccount]);
    // El refresco global se encargará de traer los datos actualizados.
  };
  const handleAccountUpdated = (updatedAccount: any) => {
    // Para actualizaciones y eliminaciones, un refresco global también es bueno.
    // Si se quiere UI optimista, se puede mantener la lógica local y luego el globalRefreshKey lo sincronizará.
    setAccounts((prev: any[]) => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
    // setRefreshKey(k => k + 1); // Ya no es necesario si globalRefreshKey refresca
  };
  const handleAccountDeleted = (deletedId: string) => {
    setAccounts((prev: any[]) => prev.filter(acc => acc.id !== deletedId));
    // setRefreshKey(k => k + 1); // Ya no es necesario si globalRefreshKey refresca
  };

  if (isLoading || loadingAccounts) {
    return <div className="p-4">Cargando cuentas...</div>;
  }
  if (error || accountsError) {
    return <div className="p-4 text-red-600">Error: {error || accountsError}</div>;
  }
  if (!spreadsheetId || !accessToken) {
    return <div className="p-4">Inicializando hoja de cálculo...</div>;
  }

  const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0)

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold tracking-tight">Cuentas</h1>
          <AddAccountForm onAccountAdded={handleAccountAdded} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Balance total</CardTitle>
            <CardDescription>Suma de todas tus cuentas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${totalBalance.toLocaleString("es-ES", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-2 text-primary">
                      <account.icon className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-lg">{account.name}</CardTitle>
                  </div>
                </div>
                <CardDescription>{account.type}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {account.currency} {account.balance.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between pt-0">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Plus className="h-3 w-3" />
                    <span>Transacción</span>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <ArrowRightLeft className="h-3 w-3" />
                    <span>Transferir</span>
                  </Button>
                  <EditAccountForm account={account} onAccountUpdated={updated => handleAccountUpdated(updated)} />
                  <DeleteAccountButton accountId={account.id} onAccountDeleted={() => handleAccountDeleted(account.id)} />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
