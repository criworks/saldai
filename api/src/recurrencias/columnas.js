/**
 * La traducción de la regla de repetición: nombres del dominio a columnas.
 *
 * Vive aparte y no en cada repositorio porque la misma regla se escribe desde
 * cuatro lugares —crear un plan, editarlo de aquí en adelante, atarlo a un
 * movimiento y crear el movimiento con su plan—, y cuatro copias de la
 * traducción es la forma más barata de que un campo nuevo quede escrito en tres
 * de ellas.
 *
 * `repeticion` llega siempre completa desde `@saldai/core` (los campos que el
 * usuario no eligió vienen en `null`, que es "derivá del ancla"), así que acá
 * no hay defaults que decidir.
 */

const VACIA = { diaDeLaSemana: null, semanaDelMes: null, diaDelMes: null, mesDelAnio: null }

/** Las columnas de `recurrencias`, para un `insert` o un `update` directo. */
function columnasDeLaRepeticion(repeticion) {
  const regla = repeticion ?? VACIA

  return {
    dia_de_la_semana: regla.diaDeLaSemana ?? null,
    semana_del_mes: regla.semanaDelMes ?? null,
    dia_del_mes: regla.diaDelMes ?? null,
    mes_del_anio: regla.mesDelAnio ?? null,
  }
}

/** Los parámetros de las funciones de Postgres que escriben un plan. */
function parametrosDeLaRepeticion(repeticion) {
  const regla = repeticion ?? VACIA

  return {
    p_dia_de_la_semana: regla.diaDeLaSemana ?? null,
    p_semana_del_mes: regla.semanaDelMes ?? null,
    p_dia_del_mes: regla.diaDelMes ?? null,
    p_mes_del_anio: regla.mesDelAnio ?? null,
  }
}

module.exports = { columnasDeLaRepeticion, parametrosDeLaRepeticion }
