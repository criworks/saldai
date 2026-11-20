import type { DiaDeLaSemana, Frecuencia, Repeticion, SemanaDelMes } from '@saldai/core'
import { SIN_REPETICION } from '@saldai/core'


/**
 * Cómo se nombra en pantalla una frecuencia y su regla de repetición.
 *
 * El catálogo de frecuencias y las reglas de qué combinaciones valen están en
 * `@saldai/core` (`FRECUENCIAS`, `validarRepeticion`), porque la API valida
 * contra ellos; lo que vive acá es solo cómo se escribe. Separado a propósito:
 * agregar una frecuencia es un cambio de dominio y de schema, y la traducción
 * no puede ser el lugar donde se decida qué existe.
 */
export const NOMBRES_FRECUENCIAS: Record<Frecuencia, string> = {
  semanal: 'Semana',
  mensual: 'Mes',
  anual: 'Año',
}

/**
 * Los días de la semana, indexados como los guarda el dominio: 0 domingo a 6
 * sábado, igual que `getUTCDay()`.
 *
 * El orden en que se muestran es cosa de la pantalla —acá la semana arranca el
 * lunes— y no cambia el índice, que es lo que viaja.
 */
export const NOMBRES_DIAS: Record<number, string> = {
  0: 'domingo',
  1: 'lunes',
  2: 'martes',
  3: 'miércoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sábado',
}

/** La inicial de cada día, para los chips. El miércoles va con dos letras. */
export const INICIALES_DIAS: Record<number, string> = {
  0: 'D',
  1: 'L',
  2: 'M',
  3: 'Mi',
  4: 'J',
  5: 'V',
  6: 'S',
}

/** Cómo se muestran los días, de lunes a domingo. */
export const DIAS_EN_ORDEN: DiaDeLaSemana[] = [1, 2, 3, 4, 5, 6, 0]

/** Las semanas del mes que se pueden elegir. `-1` es la última. */
export const SEMANAS_DEL_MES: SemanaDelMes[] = [1, 2, 3, 4, -1]

export const NOMBRES_SEMANAS: Record<number, string> = {
  1: 'primer',
  2: 'segundo',
  3: 'tercer',
  4: 'cuarto',
  [-1]: 'último',
}

/** Lo que dice el chip de cada semana. */
export const ETIQUETAS_SEMANAS: Record<number, string> = {
  1: '1ª',
  2: '2ª',
  3: '3ª',
  4: '4ª',
  [-1]: 'Última',
}

export const NOMBRES_MESES: Record<number, string> = {
  1: 'enero',
  2: 'febrero',
  3: 'marzo',
  4: 'abril',
  5: 'mayo',
  6: 'junio',
  7: 'julio',
  8: 'agosto',
  9: 'septiembre',
  10: 'octubre',
  11: 'noviembre',
  12: 'diciembre',
}

export const MESES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/** El día de la semana, el día del mes y el mes de una fecha `AAAA-MM-DD`. */
function partesDelAncla(ancla: string | null | undefined) {
  const [anio, mes, dia] = (ancla ?? '').split('-').map(Number)
  if (!anio || !mes || !dia) return null

  // Fecha civil en UTC, igual que el core: `new Date('2026-03-05')` se lee en
  // UTC y en Chile correría el día para atrás.
  return {
    // `getUTCDay()` es 0..6 por definición, que es justo `DiaDeLaSemana`: el
    // cast es acá y una sola vez, para que el resto del archivo no lo repita.
    diaDeLaSemana: new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay() as DiaDeLaSemana,
    diaDelMes: dia,
    mesDelAnio: mes,
  }
}

/**
 * La regla con los cuatro campos puestos, normalizando a `null`.
 *
 * Normaliza a null y no a undefined porque "derivá del ancla" es un null en el
 * dominio, y porque la regla puede venir de una fila que una API más vieja
 * devolvió sin estas columnas.
 */
export function reglaCompleta(parcial?: Partial<Repeticion> | null): Repeticion {
  return {
    diaDeLaSemana: parcial?.diaDeLaSemana ?? null,
    semanaDelMes: parcial?.semanaDelMes ?? null,
    diaDelMes: parcial?.diaDelMes ?? null,
    mesDelAnio: parcial?.mesDelAnio ?? null,
  }
}

/**
 * La regla **efectiva**: la que está elegida, y donde no hay nada elegido, la
 * que sale del ancla.
 *
 * Es lo que la pantalla necesita para mostrar un default que el usuario pueda
 * ver sin tocar nada: en el dominio "derivá del ancla" es un `null`, y un chip
 * no puede estar seleccionado en null. Lo que se **manda** sigue siendo la
 * regla elegida, no esta.
 */
export function reglaEfectiva(
  frecuencia: Frecuencia,
  repeticion: Partial<Repeticion> | null | undefined,
  ancla: string | null | undefined
): Repeticion {
  const regla = reglaCompleta(repeticion)
  const partes = partesDelAncla(ancla)

  if (frecuencia === 'semanal') {
    return {
      ...SIN_REPETICION,
      diaDeLaSemana: regla.diaDeLaSemana ?? partes?.diaDeLaSemana ?? null,
    }
  }

  // Con día de la semana elegido manda esa forma, y el día del calendario no
  // existe: son excluyentes, y el core rechaza las dos juntas.
  const porDiaDeLaSemana = regla.diaDeLaSemana !== null
  const mesDelAnio =
    frecuencia === 'anual' ? (regla.mesDelAnio ?? partes?.mesDelAnio ?? null) : null

  if (porDiaDeLaSemana) {
    return {
      diaDeLaSemana: regla.diaDeLaSemana,
      semanaDelMes: regla.semanaDelMes ?? 1,
      diaDelMes: null,
      mesDelAnio,
    }
  }

  return {
    diaDeLaSemana: null,
    semanaDelMes: null,
    diaDelMes: regla.diaDelMes ?? partes?.diaDelMes ?? null,
    mesDelAnio,
  }
}

/** "Cada mes" / "Cada semana" / "Cada año". */
export function descripcionDeFrecuencia(frecuencia: Frecuencia): string {
  return `Cada ${NOMBRES_FRECUENCIAS[frecuencia].toLowerCase()}`
}

/**
 * Qué día propone el plan, escrito: "el último viernes", "el 2", "los viernes".
 *
 * Se arma con la regla **efectiva**, así que un plan sin regla igual dice qué
 * día cae. Es lo que hace visible un ancla mal guardada: un plan que debía caer
 * el 2 y dice "el 30" se ve antes de esperar un mes a que proponga.
 */
export function descripcionDeRepeticion(
  frecuencia: Frecuencia,
  repeticion: Partial<Repeticion> | null | undefined,
  ancla: string | null | undefined
): string {
  const regla = reglaEfectiva(frecuencia, repeticion, ancla)
  const base = descripcionDeFrecuencia(frecuencia)

  if (frecuencia === 'semanal') {
    if (regla.diaDeLaSemana === null) return base
    return `${base}, los ${NOMBRES_DIAS[regla.diaDeLaSemana]}`
  }

  const enElMes =
    regla.diaDeLaSemana !== null && regla.semanaDelMes !== null
      ? `el ${NOMBRES_SEMANAS[regla.semanaDelMes]} ${NOMBRES_DIAS[regla.diaDeLaSemana]}`
      : regla.diaDelMes !== null
        ? `el ${regla.diaDelMes}`
        : ''

  if (frecuencia === 'mensual') return enElMes ? `${base}, ${enElMes}` : base

  const mes = regla.mesDelAnio !== null ? ` de ${NOMBRES_MESES[regla.mesDelAnio]}` : ''
  return enElMes ? `${base}, ${enElMes}${mes}` : base
}
