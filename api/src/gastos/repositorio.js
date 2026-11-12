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
    /**
     * Inserta el gasto parseado y devuelve la fila creada.
     *
     * `contexto` es la zona y el día de referencia con los que se resolvió la
     * fecha. Se guardan para que el movimiento se pueda volver a derivar desde
     * `input_original`: sin ellos, re-correr el parser cambia la fecha de todo
     * lo que se escribió como "hoy" o "ayer".
     */
    insertar(gasto, { userId, inputOriginal, contexto }) {
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
          zona: contexto?.zona,
          hoy_resuelto: contexto?.hoyResuelto,
        })
        .select()
        .single()
    },

    /**
     * Un movimiento del usuario, o `null` si no existe o no es suyo.
     *
     * `maybeSingle()` y no `single()`: pedir un id que no está no es un error
     * de base, es un 404 de la ruta. El `eq('user_id')` está además de la RLS
     * porque la RLS devuelve cero filas en silencio, y eso se ve igual que un
     * id inexistente: así la pertenencia se decide en una condición escrita y
     * no en la ausencia de resultado.
     */
    buscar(id, { userId }) {
      return supabase
        .from('gastos')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle()
    },

    /**
     * Cambia los campos que vengan y devuelve la fila como quedó.
     *
     * `campos` llega con los nombres del dominio y la traducción a columnas la
     * hace este archivo, igual que en `insertar`: así la ruta y el core no
     * saben de `monto_formateado` ni de `categoria_src`.
     *
     * `camposEditados` se escribe completo y no se le agrega acá: quien llama
     * lo armó uniendo lo que ya estaba marcado con lo que cambia ahora, porque
     * la unión es una regla del dominio (`unirCamposEditados`) y no de la tabla.
     */
    actualizar(id, { userId, campos, camposEditados }) {
      const fila = {
        editado_en: new Date().toISOString(),
        campos_editados: camposEditados,
      }

      if ('monto' in campos) fila.monto = campos.monto
      if ('montoFormateado' in campos) fila.monto_formateado = campos.montoFormateado
      if ('item' in campos) fila.item = campos.item
      if ('categoria' in campos) fila.categoria = campos.categoria
      if ('categoriaSrc' in campos) fila.categoria_src = campos.categoriaSrc
      if ('metodo' in campos) fila.metodo = campos.metodo
      if ('fecha' in campos) fila.fecha = campos.fecha
      if ('notas' in campos) fila.notas = campos.notas

      // `input_original`, `zona` y `hoy_resuelto` no se tocan nunca: siguen
      // describiendo lo que la persona escribió y con qué contexto se derivó.
      // Lo que cambia es el movimiento, y eso queda dicho en `campos_editados`.
      return supabase
        .from('gastos')
        .update(fila)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .maybeSingle()
    },

    /** Borra un movimiento del usuario y devuelve la fila que borró. */
    eliminar(id, { userId }) {
      return supabase
        .from('gastos')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .maybeSingle()
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
