/**
 * Los doce totales del año, en orden de enero a diciembre.
 *
 * La base devuelve una fila por mes con movimiento, así que un mes sin gastos
 * simplemente no viene y acá queda en 0. Se separa de `server.js` porque es la
 * única parte de la ruta anual que tiene algo que probar.
 */
function arregloDeTotales(filas) {
  const totales = Array(12).fill(0)

  for (const fila of filas ?? []) {
    const mes = Number(fila?.mes)
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) continue

    const total = Number(fila?.total)
    // `sum()` sobre una columna integer vuelve como bigint y PostgREST lo
    // puede serializar como string, así que el número se fuerza acá.
    totales[mes - 1] = Number.isFinite(total) ? total : 0
  }

  return totales
}

module.exports = { arregloDeTotales }
