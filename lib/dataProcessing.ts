// lib/dataProcessing.ts
import {
  parseISO,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  getWeek,
  getMonth,
  getYear,
  format,
  addDays,
  isAfter,
  isBefore,
  min as dateMin,
  max as dateMax,
  type Interval,
  getDay,
} from "date-fns";
import { es } from "date-fns/locale";

interface ChartData {
  labels: string[];
  income: number[];
  expenses: number[];
}

interface CategoryChartData {
  labels: string[];
  values: number[];
}

interface TrendPoint {
  name: string; // Label del eje X (e.g., mes, semana)
  [category: string]: number | string; // Valor del gasto para cada categoría
}

export interface ProcessedTrendsData {
  timeLabels: string[]; // Labels para el eje X (e.g., ["Ene", "Feb", ...])
  categoryTrends: {
    name: string; // Nombre de la categoría
    data: number[]; // Array de valores para esta categoría, correspondiendo a timeLabels
  }[];
  allCategories: string[]; // Lista de todas las categorías encontradas
}

// Helper to parse amount safely
const parseAmount = (value: string | undefined): number => {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = parseFloat(value.replace(",", ".")); // Handle comma decimal separator if needed
  return isNaN(parsed) ? 0 : parsed;
};

// Helper to parse date safely
const parseDate = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    // Attempt parsing common formats, prioritize ISO YYYY-MM-DD
    let date = parseISO(dateStr);
    if (!isNaN(date.getTime())) return date;

    // Add other potential formats if needed (e.g., DD/MM/YYYY)
    // const parts = dateStr.split('/');
    // if (parts.length === 3) {
    //   date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    //   if (!isNaN(date.getTime())) return date;
    // }

    console.warn(`Could not parse date: ${dateStr}`);
    return null;
  } catch (e) {
    console.warn(`Error parsing date: ${dateStr}`, e);
    return null;
  }
};

export function processMonthlyBalanceData(
  rows: string[][],
  period: string
): ChartData {
  console.log(
    "Processing monthly balance data for period:",
    period,
    rows.length,
    "rows"
  );
  const now = new Date();
  let interval: Interval;
  let labels: string[] = [];
  let incomeMap: { [key: string]: number } = {};
  let expensesMap: { [key: string]: number } = {};

  // Define interval and labels based on period
  switch (period) {
    case "week":
      interval = {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      }; // Monday to Sunday
      labels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
      labels.forEach((_, i) => {
        incomeMap[i.toString()] = 0;
        expensesMap[i.toString()] = 0;
      });
      break;
    case "month":
      interval = { start: startOfMonth(now), end: endOfMonth(now) };
      // Calcular rangos de semanas reales del mes
      let weekRanges = [];
      let current = startOfWeek(interval.start, { weekStartsOn: 1 }); // Lunes
      while (current <= interval.end) {
        const weekStart = dateMax([current, interval.start]);
        const weekEnd = dateMin([endOfWeek(current, { weekStartsOn: 1 }), interval.end]);
        weekRanges.push({ start: weekStart, end: weekEnd });
        current = addDays(weekEnd, 1);
      }
      labels = weekRanges.map(({ start, end }) =>
        `${format(start, "dd MMM", { locale: es })} - ${format(end, "dd MMM", { locale: es })}`
      );
      labels.forEach((_, i) => {
        incomeMap[i.toString()] = 0;
        expensesMap[i.toString()] = 0;
      });
      break;
    case "year":
    default:
      interval = { start: startOfYear(now), end: endOfYear(now) };
      labels = [
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul",
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
      ];
      labels.forEach((_, i) => {
        incomeMap[i.toString()] = 0;
        expensesMap[i.toString()] = 0;
      });
      break;
  }

  rows.forEach((row: string[]) => {
    // Assuming columns: Date (A), Type (B), Description(C), Category(D), Amount (E)
    const date = parseDate(row[0]);
    if (!date || !isWithinInterval(date, interval)) {
      return; // Skip if date is invalid or outside the period
    }

    const type = row[1]?.toLowerCase();
    const amount = parseAmount(row[4]);

    let key: string;
    switch (period) {
      case "week":
        key = ((date.getDay() + 6) % 7).toString(); // 0=Mon, 6=Sun
        break;
      case "month":
        // Group by week number within the month (real week index)
        // Buscar el índice de la semana a la que pertenece la fecha
        let weekIdx = -1;
        for (let i = 0; i < labels.length; i++) {
          const [startLabel, endLabel] = labels[i].split(" - ");
          const startDate = parseDate(startLabel + "." + now.getFullYear());
          const endDate = parseDate(endLabel + "." + now.getFullYear());
          if (startDate && endDate && date >= startDate && date <= endDate) {
            weekIdx = i;
            break;
          }
        }
        key = weekIdx !== -1 ? weekIdx.toString() : "0";
        break;
      case "year":
      default:
        key = date.getMonth().toString(); // 0=Jan, 11=Dec
        break;
    }

    if (incomeMap.hasOwnProperty(key)) {
      // Check if key exists
      if (type === "income") {
        incomeMap[key] += amount;
      } else if (type === "expense") {
        expensesMap[key] += amount;
      }
    }
  });

  const income = Object.values(incomeMap);
  const expenses = Object.values(expensesMap);

  console.log("Processed Balance Data:", { labels, income, expenses });
  return { labels, income, expenses };
}

export function processExpensesByCategoryData(
  rows: string[][],
  period: string
): CategoryChartData {
  console.log(
    "Processing category data for period:",
    period,
    rows.length,
    "rows"
  );
  const now = new Date();
  let interval: Interval;

  switch (period) {
    case "week":
      interval = {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
      break;
    case "month":
      interval = { start: startOfMonth(now), end: endOfMonth(now) };
      break;
    case "year":
    default:
      interval = { start: startOfYear(now), end: endOfYear(now) };
      break;
  }

  const categoryMap: { [key: string]: number } = {};

  rows.forEach((row: string[]) => {
    // Assuming columns: Date (A), Type (B), Description(C), Category(D), Amount (E)
    const date = parseDate(row[0]);
    if (!date || !isWithinInterval(date, interval)) {
      return; // Skip if date is invalid or outside the period
    }

    const type = row[1]?.toLowerCase();
    const category = row[3];
    const amount = parseAmount(row[4]);

    if (type === "expense" && category) {
      categoryMap[category] = (categoryMap[category] || 0) + amount;
    }
  });

  // Sort categories by amount descending and take top N (e.g., top 7 + 'Otros')
  const sortedCategories = Object.entries(categoryMap).sort(
    ([, a], [, b]) => b - a
  );

  const topN = 7;
  const labels: string[] = [];
  const values: number[] = [];
  let othersValue = 0;

  sortedCategories.forEach(([category, value], index) => {
    if (index < topN) {
      labels.push(category);
      values.push(value);
    } else {
      othersValue += value;
    }
  });

  if (othersValue > 0) {
    labels.push("Otros");
    values.push(othersValue);
  }

  console.log("Processed Category Data:", { labels, values });
  return { labels, values };
}

export function processSpendingTrendsData(
  rows: string[][],
  period: "month" | "year" | "week", // Periodo general para las tendencias
  selectedCategories?: string[] // Opcional: para calcular solo para categorías seleccionadas
): ProcessedTrendsData {
  console.log(
    "Processing spending trends data for period:",
    period,
    rows.length,
    "rows"
  );
  const now = new Date();
  let interval: import("date-fns").Interval;
  let timeLabels: string[] = [];
  
  // Mapa para acumular { [timeLabel]: { [category]: amount } }
  const trendsMap: { [timeLabel: string]: { [category: string]: number } } = {};
  const allCategoriesSet = new Set<string>();

  // Definir intervalo y timeLabels base según el período
  switch (period) {
    case "week":
      interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      timeLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
      timeLabels.forEach(label => trendsMap[label] = {});
      break;
    case "month":
      interval = { start: startOfMonth(now), end: endOfMonth(now) }; // Mes actual
      // Para tendencias mensuales, podríamos querer ver semanas o días.
      // Por simplicidad, vamos a mostrar 4-5 semanas del mes actual.
      let currentWeekStart = startOfWeek(startOfMonth(now), { weekStartsOn: 1 });
      while (currentWeekStart <= endOfMonth(now)) {
        const weekLabel = `${format(currentWeekStart, "dd/MM", { locale: es })}`;
        timeLabels.push(weekLabel);
        trendsMap[weekLabel] = {};
        currentWeekStart = addDays(currentWeekStart, 7);
      }
      if (timeLabels.length === 0 && startOfMonth(now) <= endOfMonth(now)) { // Ensure at least one label for the month
        const monthLabel = format(startOfMonth(now), "MMM yyyy", {locale: es});
        timeLabels.push(monthLabel);
        trendsMap[monthLabel] = {};
      }
      break;
    case "year":
    default:
      interval = { start: startOfYear(now), end: endOfYear(now) }; // Año actual
      timeLabels = Array.from({ length: 12 }, (_, i) => format(new Date(now.getFullYear(), i, 1), "MMM", { locale: es }));
      timeLabels.forEach(label => trendsMap[label] = {});
      break;
  }

  rows.forEach((row: string[]) => {
    const date = parseDate(row[0]); // Asumiendo parseDate de tu código existente
    if (!date || !isWithinInterval(date, interval)) {
      return; 
    }

    const type = row[1]?.toLowerCase();
    const category = row[3]; // Asumiendo que la categoría está en la columna D
    const amount = parseAmount(row[4]); // Asumiendo parseAmount de tu código existente

    if (type === "expense" && category && amount > 0) {
      allCategoriesSet.add(category);
      let timeKey: string;

      switch (period) {
        case "week":
          timeKey = timeLabels[(getDay(date) + 6) % 7]; // 0=Mon, 6=Sun (getDay es 0 para Dom)
          break;
        case "month":
          // Encontrar a qué semana pertenece
          const weekOfDate = startOfWeek(date, { weekStartsOn: 1 });
          timeKey = timeLabels.find(label => label === `${format(weekOfDate, "dd/MM", { locale: es })}`) || timeLabels[0]; // Fallback
          break;
        case "year":
        default:
          timeKey = timeLabels[getMonth(date)]; // Ene, Feb, ...
          break;
      }
      
      if (timeKey && trendsMap[timeKey]) {
        trendsMap[timeKey][category] = (trendsMap[timeKey][category] || 0) + amount;
      }
    }
  });

  const categoryTrends: ProcessedTrendsData['categoryTrends'] = [];
  const categoriesToProcess = selectedCategories || Array.from(allCategoriesSet);

  categoriesToProcess.forEach(cat => {
    const trendData: number[] = timeLabels.map(label => trendsMap[label]?.[cat] || 0);
    categoryTrends.push({ name: cat, data: trendData });
  });

  return {
    timeLabels,
    categoryTrends,
    allCategories: Array.from(allCategoriesSet).sort()
  };
}
