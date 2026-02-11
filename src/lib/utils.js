import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classNames de Tailwind CSS de forma inteligente
 * Resuelve conflictos y duplicados
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
