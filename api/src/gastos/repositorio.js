const { createSupabaseClient } = require('../supabase')

/**
 * Las consultas a la tabla `gastos`, atadas a la sesión del usuario.
 *
 * Están acá y no dentro de las rutas para que un handler no mezcle el contrato
 * HTTP con la forma de la tabla: la ruta habla de `fecha` y `montoFormateado`,
 * la tabla de `fecha` y `monto_formateado`, y la traducción es este archivo.
 * Cada método devuelve `{ data, error }`, igual que supabase-js.
 */
function repositorioDeGastos(token) {
  const supabase = createSupabaseClient(token)

  return {
    /** Inserta el gasto parseado y devuelve la fila creada. */
    insertar(gasto, { userId, inputOriginal }) {
      return supabase
        .from('gastos')
        .insert({
          monto: gasto.monto,
          monto_formateado: gasto.montoFormateado,
          item: gasto.item,
          categoria: gasto.categoria,
          categoria_src: gasto.categoriaSrc,
          metodo: gasto.metodo,
          fecha: gasto.fecha,
          input_original: inputOriginal,
          user_id: userId,
        })
        .select()
        .single()
    },

    /** Los gastos del usuario, opcionalmente de un mes y una categoría. */
    listar({ userId, rango, categoria }) {
      let query = supabase
        .from('gastos')
        .select('*')
        .eq('user_id', userId)
        .order('creado_en', { ascending: false })

      if (rango) query = query.gte('fecha', rango.desde).lt('fecha', rango.hasta)
      if (categoria) query = query.ilike('categoria', categoria)

      return query
    },

    /** Una fila por mes con movimiento: la suma la hace la base. */
    totalesDelAnio(anio) {
      return supabase.rpc('totales_por_mes', { anio })
    },
  }
}

module.exports = { repositorioDeGastos }
