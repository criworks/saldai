/**
 * Rangos de fechas para consultar la columna `fecha` (date).
 *
 * Son semiabiertos [desde, hasta): así "octubre" no depende de cuántos días
 * tiene el mes y no hay que acordarse de los años bisiestos.
 */

/** @returns {{ desde: string, hasta: string }} en formato AAAA-MM-DD */
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

module.exports = { rangoDelMes, rangoDelAnio }
