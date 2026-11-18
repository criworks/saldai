const express = require('express')
const {
  registrarMovimiento,
  hoyCivil,
  rangoDelMes,
  unirCamposEditados,
  validarCambioDeMovimiento,
  validarRecurrenciaDeMovimiento,
} = require('@saldai/core')

const { requireAuth } = require('../middleware/auth.js')
const { repositorioDeMovimientos } = require('../movimientos/repositorio')
const {
  validarAnio,
  validarAnioRequerido,
  validarId,
  validarInput,
  validarMes,
} = require('../movimientos/validacion')
const { conflicto, errorDeBase, errorDeEntrada, noEncontrado } = require('../respuestas')
const { arregloDeTotales } = require('../movimientos/totales')

/**
 * Las rutas de movimientos. `zona` es la zona horaria **por defecto** con la que se
 * resuelve el "hoy": la resuelve `cargarConfig()` y se inyecta acá, así el
 * router no lee variables de entorno por su cuenta. El cliente puede mandar la
 * suya en el cuerpo, que es lo que hace mobile con la del dispositivo; sin eso
 * un usuario fuera de Chile registraba con el día de Chile. `limites` son los limitadores de pedidos:
 * el flojo para las rutas con sesión y el estricto para la que no la pide.
 */
function rutasDeMovimientos({ zona, limites }) {
  const router = express.Router()

  // ── POST /movimientos/parsear ─ Sin auth: solo lee el input ──────────────
  router.post('/parsear', limites.sinSesion, (req, res) => {
    const entrada = validarInput(req.body?.input)
    if (!entrada.ok) return errorDeEntrada(res, entrada.errores, { advertencias: [] })

    const { contexto, ...resultado } = registrarMovimiento(entrada.valor, {
      zona: req.body?.zona || zona,
    })
    return res.status(resultado.ok ? 200 : 422).json(resultado)
  })

  // ── POST /movimientos ────────────────────────────────────────────────────
  router.post('/', limites.conSesion, requireAuth, async (req, res) => {
    const entrada = validarInput(req.body?.input)
    if (!entrada.ok) return errorDeEntrada(res, entrada.errores, { advertencias: [] })

    const { contexto, ...resultado } = registrarMovimiento(entrada.valor, {
      zona: req.body?.zona || zona,
    })
    if (!resultado.ok) return res.status(422).json(resultado)

    // La recurrencia es opcional y viaja con el alta: el usuario indica, en la
    // misma pantalla donde escribe el movimiento, que se repite. Va junto y no
    // en una segunda llamada porque a medias deja un movimiento que la persona
    // ve registrado y que no es recurrente, sin que nada lo diga.
    let recurrencia = null
    if (req.body?.recurrencia !== undefined && req.body?.recurrencia !== null) {
      const pedida = validarRecurrenciaDeMovimiento(req.body.recurrencia, {
        desde: resultado.datos.fecha,
      })
      if (!pedida.ok) return errorDeEntrada(res, pedida.errores, { advertencias: resultado.advertencias })
      recurrencia = pedida.recurrencia
    }

    const repositorio = repositorioDeMovimientos(req.token)
    const { data, error } = recurrencia
      ? await repositorio.insertarConRecurrencia(resultado.datos, {
          userId: req.userId,
          inputOriginal: entrada.valor,
          contexto,
          recurrencia,
        })
      : await repositorio.insertar(resultado.datos, {
          userId: req.userId,
          inputOriginal: entrada.valor,
          contexto,
        })

    if (error) {
      return errorDeBase(res, 'Error al guardar en base de datos', error, {
        advertencias: resultado.advertencias,
      })
    }

    return res.status(201).json({
      ok: true,
      errores: [],
      advertencias: resultado.advertencias,
      datos: {
        ...resultado.datos,
        id: data.id,
        creadoEn: data.creado_en,
        // Solo cuando el alta creó un plan: en un movimiento común la columna
        // no viaja, y mandar `null` diría que se miró y no hay, que es otra
        // cosa que no se preguntó.
        ...(recurrencia ? { recurrenciaId: data.recurrencia_id } : {}),
      },
    })
  })

  // ── POST /movimientos/:id/recurrencia ────────────────────────────────────
  //
  // Marcar como recurrente un movimiento que ya existe, de cualquier fecha. El
  // plan se ancla en la fecha de ese movimiento, que es lo que conserva el día
  // del mes, y esa primera ocurrencia queda confirmada apuntando a él: lo que
  // la persona ya tiene registrado no vuelve como propuesta.
  //
  // Lo de **después** de esa fecha sí vuelve: marcar como recurrente el
  // arriendo de hace tres meses deja esos tres meses por confirmar. Es a
  // propósito, y los decide el usuario mirando si ya los tenía cargados a mano.
  router.post('/:id/recurrencia', limites.conSesion, requireAuth, async (req, res) => {
    const id = validarId(req.params.id)
    if (!id.ok) return errorDeEntrada(res, id.errores)

    const repositorio = repositorioDeMovimientos(req.token)

    // Se lee antes de escribir para dos cosas: un id que no existe tiene que
    // dar 404 y no el error crudo de la función, y `hasta` se compara contra la
    // fecha del movimiento, que es el comienzo del plan.
    const actual = await repositorio.buscar(id.valor, { userId: req.userId })
    if (actual.error) return errorDeBase(res, 'Error al leer el movimiento', actual.error)
    if (!actual.data) return noEncontrado(res, 'No existe ese movimiento')

    const pedida = validarRecurrenciaDeMovimiento(req.body, { desde: actual.data.fecha })
    if (!pedida.ok) return errorDeEntrada(res, pedida.errores)

    const { data, error } = await repositorio.atarRecurrencia(id.valor, {
      recurrencia: pedida.recurrencia,
    })

    if (error) {
      // El unique sobre `movimiento_id` es lo que impide que dos planes digan
      // haber creado el mismo movimiento. Que lo corte la base y no una
      // comprobación previa es lo que hace que dos toques seguidos no creen
      // dos planes.
      if (error.code === '23505') {
        return conflicto(res, 'Ese movimiento ya tiene una recurrencia')
      }
      return errorDeBase(res, 'Error al crear la recurrencia', error)
    }

    return res.status(201).json({ ok: true, errores: [], datos: data })
  })

  // ── GET /movimientos ─────────────────────────────────────────────────────
  router.get('/', limites.conSesion, requireAuth, async (req, res) => {
    const { mes, anio, categoria } = req.query
    let rango

    if (mes) {
      const mesValido = validarMes(mes)
      if (!mesValido.ok) return errorDeEntrada(res, mesValido.errores)

      // Sin 'anio' se asume el año en curso. Antes el filtro era
      // `fecha ilike '%/10/%'`, que devolvía octubre de todos los años.
      const anioValido = validarAnio(anio, hoyCivil(zona).getUTCFullYear())
      if (!anioValido.ok) return errorDeEntrada(res, anioValido.errores)

      rango = rangoDelMes(anioValido.valor, mesValido.valor)
    }

    const { data, error } = await repositorioDeMovimientos(req.token).listar({
      userId: req.userId,
      rango,
      categoria,
    })

    if (error) return errorDeBase(res, 'Error al leer de base de datos', error)

    const total = data.reduce((acc, g) => acc + g.monto, 0)

    return res.status(200).json({
      ok: true,
      total,
      totalFormateado: `$${total.toLocaleString('es-CL')}`,
      cantidad: data.length,
      datos: data,
    })
  })

  // ── GET /movimientos/anuales ─────────────────────────────────────────────
  router.get('/anuales', limites.conSesion, requireAuth, async (req, res) => {
    const anioValido = validarAnioRequerido(req.query.anio)
    if (!anioValido.ok) return errorDeEntrada(res, anioValido.errores)

    const { data, error } = await repositorioDeMovimientos(req.token).totalesDelAnio(anioValido.valor)
    if (error) return errorDeBase(res, 'Error al leer de base de datos', error)

    return res.status(200).json({
      ok: true,
      anio: req.query.anio,
      totales: arregloDeTotales(data),
    })
  })

  // ── PATCH /movimientos/:id ───────────────────────────────────────────────
  //
  // La edición a mano de un movimiento. No corre el parser: el usuario ya no
  // está escribiendo una línea, está corrigiendo campos sueltos, así que
  // `input_original` queda como estaba y lo que se anota es **qué campos ya no
  // se pueden volver a derivar de él** (`campos_editados`). Sin eso, el primer
  // reclasificar masivo le pisa la corrección al usuario.
  router.patch('/:id', limites.conSesion, requireAuth, async (req, res) => {
    const id = validarId(req.params.id)
    if (!id.ok) return errorDeEntrada(res, id.errores)

    const cambio = validarCambioDeMovimiento(req.body)
    if (!cambio.ok) return errorDeEntrada(res, cambio.errores)

    const repositorio = repositorioDeMovimientos(req.token)

    // Se lee antes de escribir por dos razones, y las dos importan: `editados`
    // es una unión con lo que ya estaba marcado (si corrigió la categoría en
    // marzo y el monto hoy, las dos correcciones son suyas), y un id que no
    // existe tiene que dar 404 y no un 200 sobre cero filas, que es lo que
    // devuelve un UPDATE que la RLS no deja ver.
    const actual = await repositorio.buscar(id.valor, { userId: req.userId })
    if (actual.error) return errorDeBase(res, 'Error al leer el movimiento', actual.error)
    if (!actual.data) return noEncontrado(res, 'No existe ese movimiento')

    const { data, error } = await repositorio.actualizar(id.valor, {
      userId: req.userId,
      campos: cambio.campos,
      camposEditados: unirCamposEditados(actual.data.campos_editados, cambio.editados),
    })

    if (error) return errorDeBase(res, 'Error al guardar el movimiento', error)
    // Entre la lectura y la escritura el movimiento se pudo borrar desde otro
    // dispositivo. No es un error: ya no está.
    if (!data) return noEncontrado(res, 'No existe ese movimiento')

    return res.status(200).json({ ok: true, errores: [], datos: data })
  })

  // ── DELETE /movimientos/:id ──────────────────────────────────────────────
  //
  // Devuelve la fila que borró y no solo el id: la app tiene que saber de qué
  // mes era para invalidar ese mes, y el movimiento que se borra no siempre es
  // del mes que se está mirando.
  router.delete('/:id', limites.conSesion, requireAuth, async (req, res) => {
    const id = validarId(req.params.id)
    if (!id.ok) return errorDeEntrada(res, id.errores)

    const { data, error } = await repositorioDeMovimientos(req.token).eliminar(id.valor, {
      userId: req.userId,
    })

    if (error) return errorDeBase(res, 'Error al eliminar el movimiento', error)
    // Borrar algo que no está no es un error del cliente ni del servidor, pero
    // tampoco es un borrado: si la app mostrara "eliminado" ante un 200 vacío,
    // taparía el caso de un id de otro usuario.
    if (!data) return noEncontrado(res, 'No existe ese movimiento')

    return res.status(200).json({ ok: true, errores: [], datos: data })
  })

  return router
}

module.exports = { rutasDeMovimientos }
