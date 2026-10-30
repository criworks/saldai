const express = require('express')
const { parsearGasto, hoyCivil, rangoDelMes } = require('@saldai/core')

const { requireAuth } = require('../middleware/auth.js')
const { repositorioDeGastos } = require('../gastos/repositorio')
const {
  validarAnio,
  validarAnioRequerido,
  validarInput,
  validarMes,
} = require('../gastos/validacion')
const { errorDeBase, errorDeEntrada } = require('../respuestas')
const { arregloDeTotales } = require('../gastos/totales')

/**
 * Las rutas de gastos. `zona` es la zona horaria con la que se resuelve el
 * "hoy": la resuelve `cargarConfig()` y se inyecta acá, así el router no lee
 * variables de entorno por su cuenta.
 */
function rutasDeGastos({ zona }) {
  const router = express.Router()

  // ── POST /gastos/parsear ─ Sin auth: solo lee el input ────────────────────
  router.post('/parsear', (req, res) => {
    const entrada = validarInput(req.body?.input)
    if (!entrada.ok) return errorDeEntrada(res, entrada.errores, { advertencias: [] })

    const resultado = parsearGasto(entrada.valor, { zona })
    return res.status(resultado.ok ? 200 : 422).json(resultado)
  })

  // ── POST /gastos ─────────────────────────────────────────────────────────
  router.post('/', requireAuth, async (req, res) => {
    const entrada = validarInput(req.body?.input)
    if (!entrada.ok) return errorDeEntrada(res, entrada.errores, { advertencias: [] })

    const resultado = parsearGasto(entrada.valor, { zona })
    if (!resultado.ok) return res.status(422).json(resultado)

    const { data, error } = await repositorioDeGastos(req.token).insertar(resultado.datos, {
      userId: req.userId,
      inputOriginal: entrada.valor,
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
  router.get('/', requireAuth, async (req, res) => {
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
  router.get('/anuales', requireAuth, async (req, res) => {
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

  return router
}

module.exports = { rutasDeGastos }
