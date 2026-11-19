/**
 * La fecha de un movimiento, entre la columna y el calendario.
 *
 * Son dos funciones de tres líneas y están acá y no copiadas en cada pantalla
 * porque la conversión tiene una trampa: `new Date('2026-03-05')` se interpreta
 * en UTC, así que en Chile el picker abría en el día anterior. Se arma con las
 * partes para que el día sea el día.
 */

/** `AAAA-MM-DD` al Date de ese día en hora local, que es lo que lee el picker. */
export function diaDesdeIso(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number)
  if (!anio || !mes || !dia) return new Date()
  return new Date(anio, mes - 1, dia)
}

/** El Date que devolvió el picker a `AAAA-MM-DD`, que es lo que guarda la columna. */
export function isoDelDia(fecha: Date): string {
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mm}-${dd}`
}
