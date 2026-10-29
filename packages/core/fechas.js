/**
 * Fechas de un gasto.
 *
 * La columna `fecha` es un `date` y la API la devuelve en ISO (AAAA-MM-DD). Lo
 * que se le muestra al usuario es DD/MM/AAAA. Acá viven las dos conversiones y
 * los rangos para consultar por mes o por año.
 *
 * Nada de esto mira el reloj: el "hoy" depende de la zona horaria y se calcula
 * en la API, que es la que tiene la configuración.
 */

const MESES = Object.freeze([
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
])

/** @param {number} mes 1 a 12 */
function nombreDeMes(mes) {
  return MESES[mes - 1] ?? ''
}

/** @param {number} mes 1 a 12 → "Ene" */
function abreviaturaDeMes(mes) {
  return nombreDeMes(mes).slice(0, 3)
}

function esMesValido(mes) {
  return Number.isInteger(mes) && mes >= 1 && mes <= 12
}

/** "2026-03-15" → "15/03/2026". Lo que no tenga esa forma se devuelve igual. */
function isoAChileno(iso) {
  if (!iso) return ''
  const [anio, mes, dia] = String(iso).slice(0, 10).split('-')
  return dia && mes && anio ? `${dia}/${mes}/${anio}` : String(iso)
}

/** "15/03/2026" → "2026-03-15". Lo que no tenga esa forma devuelve null. */
function chilenoAIso(fecha) {
  const partes = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(fecha ?? '').trim())
  if (!partes) return null
  const [, dia, mes, anio] = partes
  return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
}

/** "2026-03-15" → 3. Devuelve null si no se puede leer. */
function mesDeIso(iso) {
  const mes = parseInt(String(iso ?? '').slice(5, 7), 10)
  return esMesValido(mes) ? mes : null
}

/** "2026-03-15" → 2026. Devuelve null si no se puede leer. */
function anioDeIso(iso) {
  const anio = parseInt(String(iso ?? '').slice(0, 4), 10)
  return Number.isInteger(anio) ? anio : null
}

/**
 * Rango semiabierto [desde, hasta) para un mes: así no depende de cuántos días
 * tiene el mes y no hay que acordarse de los años bisiestos.
 *
 * @returns {{ desde: string, hasta: string }} en formato AAAA-MM-DD
 */
function rangoDelMes(anio, mes) {
  const siguiente = mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 }
  return {
    desde: primerDia(anio, mes),
    hasta: primerDia(siguiente.anio, siguiente.mes),
  }
}

/** @returns {{ desde: string, hasta: string }} en formato AAAA-MM-DD */
function rangoDelAnio(anio) {
  return { desde: primerDia(anio, 1), hasta: primerDia(anio + 1, 1) }
}

function primerDia(anio, mes) {
  return `${anio}-${String(mes).padStart(2, '0')}-01`
}

module.exports = {
  MESES,
  nombreDeMes,
  abreviaturaDeMes,
  esMesValido,
  isoAChileno,
  chilenoAIso,
  mesDeIso,
  anioDeIso,
  rangoDelMes,
  rangoDelAnio,
}
