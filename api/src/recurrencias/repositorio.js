const { createSupabaseClient } = require('../supabase')

/**
 * Las consultas de los planes de recurrencia y de las decisiones ya tomadas,
 * atadas a la sesión del usuario.
 *
 * Igual que el repositorio de movimientos, la traducción entre los nombres del
 * dominio (`vigenteDesde`) y los de las columnas (`vigente_desde`) es este
 * archivo. Lo que se **lee** viaja con la forma de la fila, porque es lo que la
 * API devuelve y lo que el core y la app consumen tal cual.
 */
function repositorioDeRecurrencias(token) {
  const supabase = createSupabaseClient(token)

  return {
    /** Los planes del perfil, del más nuevo al más viejo. */
    listar({ userId }) {
      return supabase
        .from('recurrencias')
        .select('*')
        .eq('user_id', userId)
        .order('creado_en', { ascending: false })
    },

    /**
     * Un plan del perfil, o `null` si no existe o no es suyo.
     *
     * `maybeSingle()` y el `eq('user_id')` explícito por lo mismo que en
     * movimientos: con solo la RLS, un id de otro perfil devuelve cero filas en
     * silencio y eso se ve igual que un id inexistente.
     */
    buscar(id, { userId }) {
      return supabase
        .from('recurrencias')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle()
    },

    crear(plan, { userId }) {
      return supabase
        .from('recurrencias')
        .insert({
          user_id: userId,
          monto: plan.monto,
          monto_formateado: plan.montoFormateado,
          item: plan.item,
          categoria: plan.categoria,
          categoria_src: plan.categoriaSrc,
          metodo: plan.metodo,
          notas: plan.notas,
          frecuencia: plan.frecuencia,
          vigente_desde: plan.vigenteDesde,
          vigente_hasta: plan.vigenteHasta,
          input_original: plan.inputOriginal,
          zona: plan.zona,
          hoy_resuelto: plan.hoyResuelto,
        })
        .select()
        .single()
    },

    /**
     * Las decisiones ya tomadas por el perfil, con los nombres del dominio.
     *
     * Se traen todas y no las de un plan: las propuestas pendientes se
     * calculan sobre todos los planes a la vez, así que una consulta por plan
     * serían N consultas para armar una sola pantalla.
     */
    async decisiones({ userId }) {
      const { data, error } = await supabase
        .from('ocurrencias_recurrentes')
        .select('recurrencia_id, fecha_prevista, estado')
        .eq('user_id', userId)

      if (error) return { data: null, error }

      return {
        data: data.map((d) => ({
          recurrenciaId: d.recurrencia_id,
          fecha: d.fecha_prevista,
          estado: d.estado,
        })),
        error: null,
      }
    },

    /**
     * Confirma una propuesta: crea el movimiento y cierra la fecha, en una sola
     * transacción.
     *
     * Va por la función de Postgres y no por dos escrituras desde acá porque
     * las dos se tienen que ver o no verse juntas: con el movimiento primero,
     * un error en la segunda deja la propuesta pendiente y el siguiente toque
     * duplica el movimiento; con la decisión primero, un error en la segunda pierde
     * el movimiento sin que nada lo diga.
     */
    confirmar({ recurrenciaId, fechaPrevista, movimiento, camposEditados }) {
      return supabase.rpc('confirmar_ocurrencia_recurrente', {
        p_recurrencia_id: recurrenciaId,
        p_fecha_prevista: fechaPrevista,
        p_fecha: movimiento.fecha,
        p_monto: movimiento.monto,
        p_monto_formateado: movimiento.montoFormateado,
        p_item: movimiento.item,
        p_categoria: movimiento.categoria,
        p_categoria_src: movimiento.categoriaSrc,
        p_metodo: movimiento.metodo,
        p_notas: movimiento.notas,
        p_campos_editados: camposEditados,
      })
    },

    /**
     * Omitir no es borrar: deja escrito que esa fecha ya se decidió, así que la
     * propuesta no vuelve y el movimiento no existe en ninguna suma.
     */
    omitir({ userId, recurrenciaId, fechaPrevista }) {
      return supabase
        .from('ocurrencias_recurrentes')
        .insert({
          user_id: userId,
          recurrencia_id: recurrenciaId,
          fecha_prevista: fechaPrevista,
          estado: 'omitida',
        })
        .select()
        .single()
    },

    /**
     * Deshace una omisión y deja la propuesta pendiente otra vez.
     *
     * Solo las omitidas: una confirmada se deshace borrando su movimiento, y
     * eso ya devuelve la propuesta por la foreign key con `on delete cascade`.
     * Borrar la decisión sin borrar el movimiento dejaría el movimiento registrado y
     * la propuesta pendiente, o sea el mismo movimiento dos veces.
     */
    deshacerOmision({ userId, recurrenciaId, fechaPrevista }) {
      return supabase
        .from('ocurrencias_recurrentes')
        .delete()
        .eq('user_id', userId)
        .eq('recurrencia_id', recurrenciaId)
        .eq('fecha_prevista', fechaPrevista)
        .eq('estado', 'omitida')
        .select()
        .maybeSingle()
    },

    /**
     * "Editar de aquí en adelante": cierra el plan el día anterior y crea el
     * que sigue, apuntando al cerrado. También en una función de Postgres,
     * porque son dos escrituras: con el plan viejo cerrado y el nuevo sin
     * crear, el usuario se queda sin recurrencia y sin aviso.
     */
    editarDesde(id, { desde, plan }) {
      return supabase.rpc('editar_recurrencia_desde', {
        p_recurrencia_id: id,
        p_desde: desde,
        p_monto: plan.monto,
        p_monto_formateado: plan.montoFormateado,
        p_item: plan.item,
        p_categoria: plan.categoria,
        p_categoria_src: plan.categoriaSrc,
        p_metodo: plan.metodo,
        p_notas: plan.notas,
        p_frecuencia: plan.frecuencia,
        p_vigente_hasta: plan.vigenteHasta,
      })
    },
  }
}

module.exports = { repositorioDeRecurrencias }
