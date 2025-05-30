import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGoogleApi } from "@/hooks/useGoogleApi";
import { getSheetData } from "@/lib/googleApi";

interface DeleteAccountButtonProps {
  accountId: string;
  onAccountDeleted: () => void;
}

export const DeleteAccountButton: React.FC<DeleteAccountButtonProps> = ({ accountId, onAccountDeleted }) => {
  const { spreadsheetId, accessToken } = useGoogleApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!spreadsheetId || !accessToken) return;
    if (!window.confirm("¿Seguro que deseas eliminar esta cuenta? Esta acción no se puede deshacer.")) return;
    setLoading(true);
    setError(null);
    try {
      // Buscar la fila por ID
      const range = "Accounts!A2:H";
      const sheetData = await getSheetData(accessToken, spreadsheetId, range);
      if (!sheetData || !sheetData.values) throw new Error("No se pudo leer la hoja de cuentas");
      const rowIndex = sheetData.values.findIndex((row: string[]) => row[7] === accountId);
      if (rowIndex === -1) throw new Error("No se encontró la cuenta a eliminar");
      // La fila real en la hoja es rowIndex + 1 (base 0, sin encabezado)
      const deleteRequest = {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: null, // null para hoja por nombre
                dimension: "ROWS",
                startIndex: rowIndex + 1, // +1 por el encabezado
                endIndex: rowIndex + 2,
              },
            },
          },
        ],
      };
      // Obtener el ID de la hoja 'Accounts'
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meta = await metaRes.json();
      const sheet = meta.sheets.find((s: any) => s.properties.title === "Accounts");
      if (!sheet) throw new Error("No se encontró la hoja 'Accounts'");
      deleteRequest.requests[0].deleteDimension.range.sheetId = sheet.properties.sheetId;
      // Ejecutar el batchUpdate
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deleteRequest),
      });
      onAccountDeleted();
    } catch (err: any) {
      setError(err.message || "Error al eliminar la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="destructive" size="sm" className="gap-1" onClick={handleDelete} disabled={loading}>
        Eliminar
      </Button>
      {error && <div className="text-red-600 text-xs mt-1">{error}</div>}
    </>
  );
}; 