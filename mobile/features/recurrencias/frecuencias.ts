import type { Frecuencia } from '@saldai/core'

/**
 * Cómo se nombra cada frecuencia en la app.
 *
 * El catálogo de frecuencias está en `@saldai/core` (`FRECUENCIAS`), porque la
 * API valida contra él; lo que vive acá es solo cómo se escribe en pantalla.
 * Separado a propósito: agregar una frecuencia es un cambio de dominio y de
 * schema, y la traducción no puede ser el lugar donde se decida qué existe.
 */
export const NOMBRES_FRECUENCIAS: Record<Frecuencia, string> = {
  semanal: 'Semana',
  mensual: 'Mes',
  anual: 'Año',
}

/** "Cada mes desde el 05/01/2026". */
export function descripcionDeFrecuencia(frecuencia: Frecuencia): string {
  return `Cada ${NOMBRES_FRECUENCIAS[frecuencia].toLowerCase()}`
}
