"use client"

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGoogleApi } from "@/hooks/useGoogleApi";
import { getSheetData, appendSheetData, updateSheetData } from "@/lib/googleApi";
import { ExpensesByCategoryChart } from "@/components/expenses-by-category-chart";
import { useRefresh } from "@/contexts/RefreshContext";

export default function CategoriasPage() {
  const { spreadsheetId, accessToken, isLoading, error } = useGoogleApi();
  const { globalRefreshKey } = useRefresh();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<any | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!spreadsheetId || !accessToken) return;
      setLoading(true);
      try {
        const range = "Categories!A2:E";
        const data = await getSheetData(accessToken, spreadsheetId, range);
        if (data && data.values) {
          setCategories(
            data.values.map((row: string[], idx: number) => ({
              name: row[0] || "",
              type: row[1] || "gasto",
              parent: row[2] || "",
              budget: row[3] || "",
              id: row[4] || `cat-${idx}`,
            }))
          );
        } else {
          setCategories([]);
        }
      } catch (err: any) {
        setFormError(err.message || "Error al cargar categorías");
      } finally {
        setLoading(false);
      }    };
    fetchCategories();
  }, [spreadsheetId, accessToken, globalRefreshKey]);

  // Agregar o editar categoría
  const handleSaveCategory = async (data: any) => {
    if (!spreadsheetId || !accessToken) return;
    setLoading(true);
    setFormError(null);
    try {
      if (editCategory) {
        // Editar
        const range = "Categories!A2:E";
        const sheetData = await getSheetData(accessToken, spreadsheetId, range);
        const rowIndex = sheetData.values.findIndex((row: string[]) => row[4] === editCategory.id);
        if (rowIndex === -1) throw new Error("No se encontró la categoría a editar");
        const targetRange = `Categories!A${rowIndex + 2}:E${rowIndex + 2}`;
        const values = [[data.name, data.type, data.parent, data.budget, editCategory.id]];
        await updateSheetData(accessToken, spreadsheetId, targetRange, values);
        setCategories((prev) => prev.map((cat) => cat.id === editCategory.id ? { ...cat, ...data } : cat));
      } else {
        // Agregar
        const id = `cat-${Date.now()}`;
        const values = [[data.name, data.type, data.parent, data.budget, id]];
        await appendSheetData(accessToken, spreadsheetId, "Categories!A2:E", values);
        setCategories((prev) => [...prev, { ...data, id }]);      }
      setFormOpen(false);
      setEditCategory(null);
    } catch (err: any) {
      setFormError(err.message || "Error al guardar la categoría");
    } finally {
      setLoading(false);
    }
  };

  // Eliminar categoría
  const handleDeleteCategory = async (id: string) => {
    if (!spreadsheetId || !accessToken) return;
    setLoading(true);
    setFormError(null);
    try {
      const range = "Categories!A2:E";
      const sheetData = await getSheetData(accessToken, spreadsheetId, range);
      const rowIndex = sheetData.values.findIndex((row: string[]) => row[4] === id);
      if (rowIndex === -1) throw new Error("No se encontró la categoría a eliminar");
      // Obtener sheetId
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meta = await metaRes.json();
      const sheet = meta.sheets.find((s: any) => s.properties.title === "Categories");
      if (!sheet) throw new Error("No se encontró la hoja 'Categories'");
      const deleteRequest = {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: "ROWS",
                startIndex: rowIndex + 1, // +1 por encabezado
                endIndex: rowIndex + 2,
              },
            },
          },
        ],
      };
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deleteRequest),      });
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
    } catch (err: any) {
      setFormError(err.message || "Error al eliminar la categoría");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1">+ Nueva categoría</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editCategory ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
              </DialogHeader>
              <CategoryForm
                initialData={editCategory}
                onSubmit={handleSaveCategory}
                loading={loading}
                error={formError || ""}
              />
            </DialogContent>
          </Dialog>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Listado de categorías</CardTitle>
            <CardDescription>Gestiona tus categorías de gasto e ingreso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {categories.length === 0 && <p className="text-muted-foreground">No hay categorías registradas.</p>}
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between border rounded-md p-2">
                  <div>
                    <span className="font-medium">{cat.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{cat.type}</span>
                    {cat.parent && <span className="ml-2 text-xs text-muted-foreground">Padre: {cat.parent}</span>}
                    {cat.budget && <span className="ml-2 text-xs text-muted-foreground">Presupuesto: {cat.budget}</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditCategory(cat); setFormOpen(true); }}>Editar</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteCategory(cat.id)}>Eliminar</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gráfico por categorías</CardTitle>
            <CardDescription>Visualiza la distribución de tus gastos e ingresos por categoría</CardDescription>
          </CardHeader>          <CardContent>
            <ExpensesByCategoryChart
              spreadsheetId={spreadsheetId ?? ""}
              accessToken={accessToken ?? ""}
            />
          </CardContent>
        </Card>
        {typeof error === 'string' && error && <div className="text-red-600 text-sm">{error}</div>}
      </div>
    </AppLayout>
  );
}

// Formulario de categoría
function CategoryForm({ initialData, onSubmit, loading, error }: { initialData?: any, onSubmit: (data: any) => void, loading: boolean, error: string | null }) {
  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState(initialData?.type || "gasto");
  const [parent, setParent] = useState(initialData?.parent || "");
  const [budget, setBudget] = useState(initialData?.budget || "");

  useEffect(() => {
    setName(initialData?.name || "");
    setType(initialData?.type || "gasto");
    setParent(initialData?.parent || "");
    setBudget(initialData?.budget || "");
  }, [initialData]);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit({ name, type, parent, budget });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block mb-1 font-medium">Nombre</label>
        <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Ej: Alimentación" />
      </div>
      <div>
        <label className="block mb-1 font-medium">Tipo</label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="gasto">Gasto</SelectItem>
            <SelectItem value="ingreso">Ingreso</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block mb-1 font-medium">Categoría padre</label>
        <Input value={parent} onChange={e => setParent(e.target.value)} placeholder="Opcional" />
      </div>
      <div>
        <label className="block mb-1 font-medium">Presupuesto</label>
        <Input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Opcional" />
      </div>
      {typeof error === 'string' && error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
      </div>
    </form>
  );
} 