"use client"

import type React from "react";
import { useEffect, useState } from "react"; // Added useEffect, useState
import { TrendingDown, TrendingUp, Lightbulb, LucideIcon } from "lucide-react"; // Adjusted import
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSheetData } from "@/lib/googleApi"; // Added
import { Skeleton } from "@/components/ui/skeleton"; // Added
import { useRefresh } from "@/contexts/RefreshContext";
// Assume a processing function exists or will be created
// import { generateFinancialInsights } from "@/lib/dataProcessing";

// Define props interface
interface FinancialInsightsProps {
  spreadsheetId: string;
  accessToken: string;
}

interface Insight {
  id: string;
  type: "warning" | "achievement" | "tip" | string; // Ajustar según los tipos reales
  title: string;
  description: string;
  icon: React.ElementType; // Asumo que es un componente de icono
}

export function FinancialInsights({ spreadsheetId, accessToken }: FinancialInsightsProps) { // Accept props
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { globalRefreshKey } = useRefresh();

   useEffect(() => {
    const fetchInsightsData = async () => {
      if (!spreadsheetId || !accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        // En un caso real, aquí obtendrías y procesarías datos.
        // Usando datos de ejemplo que coinciden con la estructura Insight definida:
        const exampleInsights: Insight[] = [
          {
            id: "1",
            type: "warning",
            title: "Gasto elevado en Restaurantes",
            description: "Has gastado un 20% más que tu promedio mensual.",
            icon: TrendingUp, 
          },
          {
            id: "2",
            type: "achievement", 
            title: "¡Buen trabajo en Ahorros!",
            description: "Reducción de gastos generales este mes.",
            icon: TrendingDown, 
          },
          {
            id: "3",
            type: "tip", 
            title: "Consejo: Revisar Suscripciones",
            description: "Detectamos algunas suscripciones con poco uso.",
            icon: Lightbulb, 
          }
        ];
        setInsights(exampleInsights);
      } catch (err: any) {
        console.error("Error fetching financial insights:", err);
        setError("No se pudieron cargar las recomendaciones.");
        setInsights([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsightsData();
  }, [spreadsheetId, accessToken, globalRefreshKey]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 p-4">Error loading insights: {error}</p>;
  }

  if (insights.length === 0) {
     return <p className="text-muted-foreground p-4 text-center">No hay recomendaciones disponibles por el momento.</p>;
  }

  return (
    <div className="space-y-3">
      {insights.map((insight) => (
        <Alert
          key={insight.id}
          // Correct the variant assignment: Use 'default' if type is 'tip' or any other non-warning/achievement type
          variant={insight.type === "warning" ? "destructive" : "default"}
        >
          <insight.icon className="h-4 w-4" />
          <AlertTitle>{insight.title}</AlertTitle>
          <AlertDescription>{insight.description}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
