const express = require('express')
const {
  aIsoCivil,
  esOcurrenciaDelPlan,
  hoyCivil,
  movimientoDeLaPropuesta,
  planVigente,
  propuestasPendientes,
  validarCambioDeMovimiento,
  validarCambioDePlan,
  validarPlanDeRecurrencia,
} = require('@saldai/core')

const { requireAuth } = require('../middleware/auth.js')
const { repositorioDeRecurrencias } = require('../recurrencias/repositorio')
const {
  validarIdDeRecurrencia,
  validarPropuesta,
  zonaDelPedido,
} = require('../recurrencias/validacion')
const { errorDeBase, errorDeEntrada, noEncontrado } = require('../respuestas')

/**
 * Las rutas de recurrencia con confirmación.
 *
 * El plan propone; **confirmar es lo que crea el movimiento**. Por eso no hay
 * ninguna ruta que registre algo sola, ni nada que corra en segundo plano: una
 * propuesta pendiente es la ausencia de una decisión, y se deriva del plan cada
 * vez que se la pide (`@saldai/core/recurrencias`).
 *
 * `zona` es la zona por defecto con la que se resuelve el "hoy", igual que en
 * las rutas de movimientos: el cliente manda la suya y acá se cae a la de la config.
 * Importa más que en un alta, porque el "hoy" decide **cuántas** propuestas se
 * le deben al usuario: con la zona equivocada, el día 1 a las 23:00 en Chile la
 * API todavía no propondría la cuota del mes.
 */
function rutasDeRecurrencias({ zona, limites }) {
  const router = express.Router()

  // ── GET /recurrencias ────────────────────────────────────────────────────
  //
  // Por defecto solo los planes que siguen proponiendo. Los terminados no se
  // borran (no hay DELETE en la tabla, a propósito: la cadena de planes es el
  // historial), así que sin este filtro la lista crecería con cada edición de
  // "de aquí en adelante".
  router.get('/', limites.conSesion, requireAuth, async (req, res) => {
    const { data, error } = await repositorioDeRecurrencias(req.token).listar({
      userId: req.userId,
    })

    if (error) return errorDeBase(res, 'Error al leer las recurrencias', error)

    const { zona: zonaUsada, advertencias } = zonaDelPedido(req.query.zona, zona)
    const hoy = aIsoCivil(hoyCivil(zonaUsada))
    const datos = req.query.todas === '1' ? data : data.filter((p) => planVigente(p, hoy))

    return res.status(200).json({ ok: true, errores: [], advertencias, datos })
  })

  // ── POST /recurrencias ───────────────────────────────────────────────────
  //
  // El plan se escribe con la misma línea que un movimiento y lo lee
  // `registrarMovimiento`, el único punto de entrada de escritura: así una
  // categoría o un método significan lo mismo en un plan que en un movimiento, y la
  // fecha de la línea queda como el ancla de la recurrencia.
  router.post('/', limites.conSesion, requireAuth, async (req, res) => {
    const entrada = validarPlanDeRecurrencia(req.body, { zona: req.body?.zona || zona })
    if (!entrada.ok) {
      // 422 y no 400 cuando lo que falló fue leer la línea, igual que en
      // `POST /movimientos`: el cuerpo estaba bien formado, el contenido no.
      const estado = entrada.errorDeLectura ? 422 : 400
      return res
        .status(estado)
        .json({ ok: false, errores: entrada.errores, advertencias: entrada.advertencias, datos: null })
    }

    const { data, error } = await repositorioDeRecurrencias(req.token).crear(entrada.plan, {
      userId: req.userId,
    })

    if (error) return errorDeBase(res, 'Error al guardar la recurrencia', error)

    return res
      .status(201)
      .json({ ok: true, errores: [], advertencias: entrada.advertencias, datos: data })
  })

  // ── GET /recurrencias/propuestas ─────────────────────────────────────────
  //
  // Hasta hoy y no más allá: la confirmación existe para registrar lo que ya
  // ocurrió, y una pantalla llena de fechas futuras no le dice al usuario qué
  // le falta hacer. La propuesta más vieja va primero, que es la que se está
  // olvidando.
  //
  // Va antes de `/:id` para que `propuestas` no se lea como un id.
  router.get('/propuestas', limites.conSesion, requireAuth, async (req, res) => {
    const repositorio = repositorioDeRecurrencias(req.token)
    const { zona: zonaUsada, advertencias } = zonaDelPedido(req.query.zona, zona)
    const hoy = aIsoCivil(hoyCivil(zonaUsada))

    const planes = await repositorio.listar({ userId: req.userId })
    if (planes.error) return errorDeBase(res, 'Error al leer las recurrencias', planes.error)

    const decisiones = await repositorio.decisiones({ userId: req.userId })
    if (decisiones.error) {
      return errorDeBase(res, 'Error al leer las ocurrencias', decisiones.error)
    }

    const propuestas = propuestasPendientes(planes.data, decisiones.data, { hasta: hoy })

    return res.status(200).json({
      ok: true,
      errores: [],
      advertencias,
      cantidad: propuestas.length,
      datos: propuestas.map(({ recurrenciaId, fecha, plan }) => ({
        recurrenciaId,
        fecha,
        // El movimiento tal como quedaría si se confirma sin tocar nada. Se
        // manda armado y no el plan crudo para que la app no tenga que volver
        // a decidir qué campo gana: lo decide el core, en un solo lugar.
        movimiento: movimientoDeLaPropuesta(plan, fecha).movimiento,
        recurrencia: plan,
      })),
    })
  })

  // ── POST /recurrencias/propuestas/confirmar ──────────────────────────────
  //
  // Crea el movimiento y cierra la propuesta, en una sola transacción (la
  // función `confirmar_ocurrencia_recurrente`). `cambio` es "editar solo esta
  // vez": se valida con lo mismo que el `PATCH` de un movimiento, y los campos
  // que de verdad difieren del plan quedan marcados en `campos_editados`, así
  // un reclasificar masivo no le pisa la corrección.
  router.post('/propuestas/confirmar', limites.conSesion, requireAuth, async (req, res) => {
    const propuesta = validarPropuesta(req.body)
    if (!propuesta.ok) return errorDeEntrada(res, propuesta.errores)

    const repositorio = repositorioDeRecurrencias(req.token)

    const plan = await repositorio.buscar(propuesta.valor.recurrenciaId, { userId: req.userId })
    if (plan.error) return errorDeBase(res, 'Error al leer la recurrencia', plan.error)
    if (!plan.data) return noEncontrado(res, 'No existe esa recurrencia')

    // Que la fecha sea una de las que el plan propone se comprueba acá y no se
    // da por buena: sin esto, el cuerpo podría cerrar cualquier fecha y crear
    // un movimiento con el monto del plan en un día que nunca se propuso.
    if (!esOcurrenciaDelPlan(plan.data, propuesta.valor.fecha)) {
      return errorDeEntrada(res, ['Esa fecha no es una ocurrencia de la recurrencia'])
    }

    let campos = {}
    if (req.body?.cambio !== undefined && req.body?.cambio !== null) {
      const cambio = validarCambioDeMovimiento(req.body.cambio)
      if (!cambio.ok) return errorDeEntrada(res, cambio.errores)
      campos = cambio.campos
    }

    const { movimiento, camposEditados } = movimientoDeLaPropuesta(
      plan.data,
      propuesta.valor.fecha,
      campos
    )

    const { data, error } = await repositorio.confirmar({
      recurrenciaId: propuesta.valor.recurrenciaId,
      fechaPrevista: propuesta.valor.fecha,
      movimiento,
      camposEditados,
    })

    if (error) {
      // 23505 es la violación del unique de la ocurrencia: esa fecha ya estaba
      // decidida. Es lo que hace que un doble toque no cree dos movimientos, y
      // es un 409 del cliente y no un error de la base.
      if (error.code === '23505') {
        return res
          .status(409)
          .json({ ok: false, errores: ['Esa propuesta ya estaba decidida'], datos: null })
      }
      return errorDeBase(res, 'Error al confirmar la propuesta', error)
    }

    return res.status(201).json({ ok: true, errores: [], datos: data })
  })

  // ── POST /recurrencias/propuestas/omitir ─────────────────────────────────
  //
  // Omitir no es borrar: deja escrito que esa fecha ya se decidió. No crea
  // ningún movimiento, así que no aparece en ninguna suma, y la propuesta no
  // vuelve a ofrecerse.
  router.post('/propuestas/omitir', limites.conSesion, requireAuth, async (req, res) => {
    const propuesta = validarPropuesta(req.body)
    if (!propuesta.ok) return errorDeEntrada(res, propuesta.errores)

    const repositorio = repositorioDeRecurrencias(req.token)

    const plan = await repositorio.buscar(propuesta.valor.recurrenciaId, { userId: req.userId })
    if (plan.error) return errorDeBase(res, 'Error al leer la recurrencia', plan.error)
    if (!plan.data) return noEncontrado(res, 'No existe esa recurrencia')

    if (!esOcurrenciaDelPlan(plan.data, propuesta.valor.fecha)) {
      return errorDeEntrada(res, ['Esa fecha no es una ocurrencia de la recurrencia'])
    }

    const { data, error } = await repositorio.omitir({
      userId: req.userId,
      recurrenciaId: propuesta.valor.recurrenciaId,
      fechaPrevista: propuesta.valor.fecha,
    })

    if (error) {
      if (error.code === '23505') {
        return res
          .status(409)
          .json({ ok: false, errores: ['Esa propuesta ya estaba decidida'], datos: null })
      }
      return errorDeBase(res, 'Error al omitir la propuesta', error)
    }

    return res.status(201).json({ ok: true, errores: [], datos: data })
  })

  // ── DELETE /recurrencias/propuestas/omitida ──────────────────────────────
  //
  // Deshace una omisión: la propuesta de esa fecha vuelve a estar pendiente.
  // Solo las omitidas. Una confirmada se deshace borrando su movimiento, y eso
  // ya devuelve la propuesta por la foreign key con `on delete cascade`; borrar
  // la decisión dejando el movimiento sería el mismo movimiento dos veces.
  router.delete('/propuestas/omitida', limites.conSesion, requireAuth, async (req, res) => {
    const propuesta = validarPropuesta(req.query)
    if (!propuesta.ok) return errorDeEntrada(res, propuesta.errores)

    const { data, error } = await repositorioDeRecurrencias(req.token).deshacerOmision({
      userId: req.userId,
      recurrenciaId: propuesta.valor.recurrenciaId,
      fechaPrevista: propuesta.valor.fecha,
    })

    if (error) return errorDeBase(res, 'Error al deshacer la omisión', error)
    if (!data) return noEncontrado(res, 'No hay una omisión en esa fecha')

    return res.status(200).json({ ok: true, errores: [], datos: data })
  })

  // ── PATCH /recurrencias/:id ──────────────────────────────────────────────
  //
  // "Editar de aquí en adelante". `desde` es obligatorio: es lo que distingue
  // esta acción de "editar solo esta vez", y sin él habría que elegir un
  // default que cambiaría en silencio lo que el usuario pidió.
  //
  // Lo ya confirmado no se toca, y no porque esta ruta lo cuide: las
  // ocurrencias confirmadas son filas de `movimientos` y acá no se mira ninguna.
  router.patch('/:id', limites.conSesion, requireAuth, async (req, res) => {
    const id = validarIdDeRecurrencia(req.params.id)
    if (!id.ok) return errorDeEntrada(res, id.errores)

    const repositorio = repositorioDeRecurrencias(req.token)

    const plan = await repositorio.buscar(id.valor, { userId: req.userId })
    if (plan.error) return errorDeBase(res, 'Error al leer la recurrencia', plan.error)
    if (!plan.data) return noEncontrado(res, 'No existe esa recurrencia')

    const cambio = validarCambioDePlan(plan.data, req.body)
    if (!cambio.ok) return errorDeEntrada(res, cambio.errores)

    const { data, error } = await repositorio.editarDesde(id.valor, {
      desde: cambio.desde,
      plan: cambio.plan,
    })

    if (error) return errorDeBase(res, 'Error al guardar la recurrencia', error)

    return res.status(200).json({ ok: true, errores: [], datos: data })
  })

  return router
}

module.exports = { rutasDeRecurrencias }
