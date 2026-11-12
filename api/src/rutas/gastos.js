const express = require('express')
const {
  registrarMovimiento,
  hoyCivil,
  rangoDelMes,
  unirCamposEditados,
  validarCambioDeMovimiento,
} = require('@saldai/core')

const { requireAuth } = require('../middleware/auth.js')
const { repositorioDeGastos } = require('../gastos/repositorio')
const {
  validarAnio,
  validarAnioRequerido,
  validarId,
  validarInput,
  validarMes,
} = require('../gastos/validacion')
const { errorDeBase, errorDeEntrada, noEncontrado } = require('../respuestas')
const { arregloDeTotales } = require('../gastos/totales')

/**
 * Las rutas de gastos. `zona` es la zona horaria **por defecto** con la que se
 * resuelve el "hoy": la resuelve `cargarConfig()` y se inyecta acá, así el
 * router no lee variables de entorno por su cuenta. El cliente puede mandar la
 * suya en el cuerpo, que es lo que hace mobile con la del dispositivo; sin eso
 * un usuario fuera de Chile registraba con el día de Chile. `limites` son los limitadores de pedidos:
 * el flojo para las rutas con sesión y el estricto para la que no la pide.
 */
function rutasDeGastos({ zona, limites }) {
  const router = express.Router()

  // ── POST /gastos/parsear ─ Sin auth: solo lee el input ────────────────────
  router.post('/parsear', limites.sinSesion, (req, res) => {
    const entrada = validarInput(req.body?.input)
    if (!entrada.ok) return errorDeEntrada(res, entrada.errores, { advertencias: [] })

    const { contexto, ...resultado } = registrarMovimiento(entrada.valor, {
      zona: req.body?.zona || zona,
    })
    return res.status(resultado.ok ? 200 : 422).json(resultado)
  })

  // ── POST /gastos ─────────────────────────────────────────────────────────
  router.post('/', limites.conSesion, requireAuth, async (req, res) => {
    const entrada = validarInput(req.body?.input)
    if (!entrada.ok) return errorDeEntrada(res, entrada.errores, { advertencias: [] })

    const { contexto, ...resultado } = registrarMovimiento(entrada.valor, {
      zona: req.body?.zona || zona,
    })
    if (!resultado.ok) return res.status(422).json(resultado)

    const { data, error } = await repositorioDeGastos(req.token).insertar(resultado.datos, {
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
      datos: { ...resultado.datos, id: data.id, creadoEn: data.creado_en },
    })
  })

  // ── GET /gastos ──────────────────────────────────────────────────────────
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

    const { data, error } = await repositorioDeGastos(req.token).listar({
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

  // ── GET /gastos/anuales ──────────────────────────────────────────────────
  router.get('/anuales', limites.conSesion, requireAuth, async (req, res) => {
    const anioValido = validarAnioRequerido(req.query.anio)
    if (!anioValido.ok) return errorDeEntrada(res, anioValido.errores)

    const { data, error } = await repositorioDeGastos(req.token).totalesDelAnio(anioValido.valor)
    if (error) return errorDeBase(res, 'Error al leer de base de datos', error)

    return res.status(200).json({
      ok: true,
      anio: req.query.anio,
      totales: arregloDeTotales(data),
    })
  })

  // ── PATCH /gastos/:id ────────────────────────────────────────────────────
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

    const repositorio = repositorioDeGastos(req.token)

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

  // ── DELETE /gastos/:id ───────────────────────────────────────────────────
  //
  // Devuelve la fila que borró y no solo el id: la app tiene que saber de qué
  // mes era para invalidar ese mes, y el movimiento que se borra no siempre es
  // del mes que se está mirando.
  router.delete('/:id', limites.conSesion, requireAuth, async (req, res) => {
    const id = validarId(req.params.id)
    if (!id.ok) return errorDeEntrada(res, id.errores)

    const { data, error } = await repositorioDeGastos(req.token).eliminar(id.valor, {
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

module.exports = { rutasDeGastos }
