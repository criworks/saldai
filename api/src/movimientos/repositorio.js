const { createSupabaseClient } = require('../supabase')
const { parametrosDeLaRepeticion } = require('../recurrencias/columnas')

/**
 * Las consultas a la tabla `movimientos`, atadas a la sesión del usuario.
 *
 * Están acá y no dentro de las rutas para que un handler no mezcle el contrato
 * HTTP con la forma de la tabla: la ruta habla de `fecha` y `montoFormateado`,
 * la tabla de `fecha` y `monto_formateado`, y la traducción es este archivo.
 * Cada método devuelve `{ data, error }`, igual que supabase-js.
 */
function repositorioDeMovimientos(token) {
  const supabase = createSupabaseClient(token)

  return {
    /**
     * Inserta el movimiento parseado y devuelve la fila creada.
     *
     * `contexto` es la zona y el día de referencia con los que se resolvió la
     * fecha. Se guardan para que el movimiento se pueda volver a derivar desde
     * `input_original`: sin ellos, re-correr el parser cambia la fecha de todo
     * lo que se escribió como "hoy" o "ayer".
     */
    insertar(movimiento, { userId, inputOriginal, contexto }) {
      return supabase
        .from('movimientos')
        .insert({
          monto: movimiento.monto,
          monto_formateado: movimiento.montoFormateado,
          item: movimiento.item,
          categoria: movimiento.categoria,
          categoria_src: movimiento.categoriaSrc,
          metodo: movimiento.metodo,
          fecha: movimiento.fecha,
          input_original: inputOriginal,
          user_id: userId,
          zona: contexto?.zona,
          hoy_resuelto: contexto?.hoyResuelto,
        })
        .select()
        .single()
    },

    /**
     * Inserta el movimiento y, en la misma transacción, el plan que lo repite.
     *
     * Dos llamadas sueltas —insertar y después atar— dejan, cuando la segunda
     * falla, un movimiento que la persona ve registrado y que no es
     * recurrente, sin que nada lo diga. La función de Postgres hace las tres
     * escrituras o ninguna.
     *
     * Devuelve la fila de la vista, con `recurrencia_id` ya resuelto: la
     * pantalla muestra el movimiento como recurrente apenas se crea, sin
     * volver a pedir el mes.
     */
    insertarConRecurrencia(movimiento, { userId, inputOriginal, contexto, recurrencia }) {
      return supabase
        .rpc('crear_movimiento_con_recurrencia', {
          p_user_id: userId,
          p_monto: movimiento.monto,
          p_monto_formateado: movimiento.montoFormateado,
          p_item: movimiento.item,
          p_categoria: movimiento.categoria,
          p_categoria_src: movimiento.categoriaSrc,
          p_metodo: movimiento.metodo,
          p_fecha: movimiento.fecha,
          p_input_original: inputOriginal,
          p_zona: contexto?.zona,
          p_hoy_resuelto: contexto?.hoyResuelto,
          p_frecuencia: recurrencia.frecuencia,
          ...parametrosDeLaRepeticion(recurrencia.repeticion),
          p_vigente_hasta: recurrencia.vigenteHasta,
        })
    },

    /**
     * Ata un plan a un movimiento que ya existe y devuelve el plan creado.
     *
     * El ancla es la fecha del movimiento y esa primera ocurrencia queda
     * confirmada apuntando a él, así que lo que la persona ya tiene registrado
     * no vuelve como propuesta. Lo de **después** de esa fecha sí: marcar como
     * recurrente algo de hace tres meses deja esos meses por confirmar, y los
     * decide el usuario.
     */
    atarRecurrencia(id, { recurrencia }) {
      return supabase
        .rpc('atar_recurrencia_a_movimiento', {
          p_movimiento_id: id,
          p_frecuencia: recurrencia.frecuencia,
          ...parametrosDeLaRepeticion(recurrencia.repeticion),
          p_vigente_hasta: recurrencia.vigenteHasta,
        })
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
        .from('movimientos')
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
        .from('movimientos')
        .update(fila)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .maybeSingle()
    },

    /** Borra un movimiento del usuario y devuelve la fila que borró. */
    eliminar(id, { userId }) {
      return supabase
        .from('movimientos')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .maybeSingle()
    },

    /**
     * Los movimientos del usuario, opcionalmente de un mes y una categoría.
     *
     * Lee de `movimientos_con_recurrencia` y no de la tabla: es la misma fila
     * más `recurrencia_id`, el plan del que nace el movimiento. La app lo
     * necesita para mostrar si es recurrente, y resolverlo cruzando las dos
     * listas del lado del cliente serían dos consultas y una regla de la base
     * repetida afuera. Escribir sigue siendo contra la tabla.
     */
    listar({ userId, rango, categoria }) {
      let query = supabase
        .from('movimientos_con_recurrencia')
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

module.exports = { repositorioDeMovimientos }
