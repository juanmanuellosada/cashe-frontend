import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classNames de Tailwind CSS de forma inteligente
 * Resuelve conflictos y duplicados
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Extrae el año-mes (yyyy-MM) de un period en formato yyyy-MM-dd.
 * Usado para conciliar pagos de resumen por año-mes + moneda, de modo
 * que un cambio en el día de cierre no rompa el match con pagos ya registrados.
 */
export function statementMonthKey(period) {
  return period.slice(0, 7);
}
