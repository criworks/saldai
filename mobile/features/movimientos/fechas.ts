/**
 * La fecha de un movimiento: entre la columna, el calendario y el encabezado.
 *
 * Son funciones de tres líneas y están acá y no copiadas en cada pantalla
 * porque la conversión tiene una trampa: `new Date('2026-03-05')` se interpreta
 * en UTC, así que en Chile el picker abría en el día anterior. Se arma con las
 * partes para que el día sea el día.
 */

/** `true` si el texto es `AAAA-MM-DD` con tres números. */
export function esIsoDeDia(iso: string | undefined | null): boolean {
  const partes = iso?.split('-').map(Number)
  return !!partes && partes.length === 3 && partes.every((n) => Number.isFinite(n) && n !== 0)
}

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

/**
 * "Hoy", "Ayer", o `null` si es cualquier otro día.
 *
 * Está acá porque la cuenta es la misma en el chip de la captura y en el
 * encabezado del listado, y las dos tienen la misma sutileza: hay que llevar
 * los dos días a medianoche antes de compararlos, o un movimiento de esta
 * mañana deja de ser "Hoy" a media tarde.
 */
export function nombreRelativoDelDia(dia: Date, hoy: Date = new Date()): 'Hoy' | 'Ayer' | null {
  const cero = new Date(hoy)
  cero.setHours(0, 0, 0, 0)

  const elDia = new Date(dia)
  elDia.setHours(0, 0, 0, 0)

  const dias = Math.round((cero.getTime() - elDia.getTime()) / 86_400_000)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  return null
}

/** El título del grupo de un día en el listado: "Hoy", "Ayer" o "Jue 26". */
export function tituloDelDia(iso: string): string {
  // Una fecha que no se puede leer no se inventa: la columna es `date` y la API
  // devuelve ISO, así que esto solo pasa con datos que no deberían existir, y
  // es mejor verlos juntos bajo un título raro que repartidos como si fueran de
  // hoy.
  if (!esIsoDeDia(iso)) return 'Desconocido'

  const dia = diaDesdeIso(iso)
  const relativo = nombreRelativoDelDia(dia)
  if (relativo) return relativo

  // El resto, abreviado y sin el punto que agrega la plataforma: "Jue 26".
  const formato = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric' })
  const texto = formato.format(dia).replace('.', '')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** El último día del mes, como `AAAA-MM-DD`. `mes` va de 1 a 12. */
export function finDelMes(mes: number, anio: number): string {
  // El día 0 del mes siguiente es el último del mes pedido, sin tener que saber
  // cuántos días tiene ni si el año es bisiesto.
  return isoDelDia(new Date(anio, mes, 0))
}
