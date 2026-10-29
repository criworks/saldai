require('express-async-errors')
require('dotenv').config()

const { cargarConfig } = require('./src/config')
const { requireAuth } = require('./src/middleware/auth.js')
const express = require('express')
const cors = require('cors')
const { createSupabaseClient, createAnonClient } = require('./src/supabase')
const {
  parsearGasto,
  hoyCivil,
  rangoDelMes,
  rangoDelAnio,
  mesDeIso,
} = require('@saldai/core')

const { puerto: PORT, origenesPermitidos, zona: ZONA } = cargarConfig()

const app = express()

app.use(cors({ origin: origenesPermitidos }))
app.use(express.json())

// ── POST /gastos/parsear ────────────────────────────────────────────────────
app.post('/gastos/parsear', (req, res) => {
  const { input } = req.body

  if (!input || typeof input !== 'string') {
    return res.status(400).json({
      ok: false,
      errores: ["El campo 'input' es requerido y debe ser un string"],
      advertencias: [],
      datos: null,
    })
  }

  const resultado = parsearGasto(input, { zona: ZONA })
  return res.status(resultado.ok ? 200 : 422).json(resultado)
})

// ── POST /gastos ─ Ruta protegida ───────────────────────────────────────────────────────────
app.post('/gastos', requireAuth, async (req, res) => {
  const supabase = createSupabaseClient(req.token)
  const { input } = req.body

  if (!input || typeof input !== 'string') {
    return res.status(400).json({
      ok: false,
      errores: ["El campo 'input' es requerido y debe ser un string"],
      advertencias: [],
      datos: null,
    })
  }

  const resultado = parsearGasto(input, { zona: ZONA })

  if (!resultado.ok) {
    return res.status(422).json(resultado)
  }

  const { data, error } = await supabase
    .from('gastos')
    .insert({
      monto: resultado.datos.monto,
      monto_formateado: resultado.datos.montoFormateado,
      item: resultado.datos.item,
      categoria: resultado.datos.categoria,
      categoria_src: resultado.datos.categoriaSrc,
      metodo: resultado.datos.metodo,
      fecha: resultado.datos.fecha,
      input_original: input,
      user_id: req.userId,
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase error:', error)
    return res.status(500).json({
      ok: false,
      errores: ['Error al guardar en base de datos'],
      advertencias: resultado.advertencias,
      datos: null,
    })
  }

  return res.status(201).json({
    ok: true,
    errores: [],
    advertencias: resultado.advertencias,
    datos: { ...resultado.datos, id: data.id, creadoEn: data.creado_en },
  })
})

// ── GET /gastos ─ Ruta protegida ───────────────────────────────────────────────────────────
app.get('/gastos', requireAuth, async (req, res) => {
  const supabase = createSupabaseClient(req.token)
  const { mes, anio, categoria } = req.query

  let query = supabase
    .from('gastos')
    .select('*')
    .eq('user_id', req.userId)
    .order('creado_en', { ascending: false })

  if (mes) {
    const mesNum = parseInt(mes, 10)
    if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
      return res.status(400).json({
        ok: false,
        errores: ["El parámetro 'mes' debe ser un número entre 1 y 12"],
        datos: null,
      })
    }

    // Sin 'anio' se asume el año en curso. Antes el filtro era
    // `fecha ilike '%/10/%'`, que devolvía octubre de todos los años.
    const anioNum = anio === undefined ? hoyCivil(ZONA).getUTCFullYear() : parseInt(anio, 10)
    if (isNaN(anioNum) || anioNum < 2000 || anioNum > 2100) {
      return res.status(400).json({
        ok: false,
        errores: ["El parámetro 'anio' debe ser un año entre 2000 y 2100"],
        datos: null,
      })
    }

    const { desde, hasta } = rangoDelMes(anioNum, mesNum)
    query = query.gte('fecha', desde).lt('fecha', hasta)
  }

  if (categoria) {
    query = query.ilike('categoria', categoria)
  }

  const { data, error } = await query

  if (error) {
    console.error('Supabase error:', error)
    return res.status(500).json({
      ok: false,
      errores: ['Error al leer de base de datos'],
      datos: null,
    })
  }

  const total = data.reduce((acc, g) => acc + g.monto, 0)
  const totalFormateado = `$${total.toLocaleString('es-CL')}`

  return res.status(200).json({
    ok: true,
    total,
    totalFormateado,
    cantidad: data.length,
    datos: data,
  })
})

// ── GET /gastos/anuales ─ Ruta protegida ───────────────────────────────────────────────────────────
app.get('/gastos/anuales', requireAuth, async (req, res) => {
  const supabase = createSupabaseClient(req.token)
  const { anio } = req.query

  if (!anio || isNaN(parseInt(anio, 10))) {
    return res.status(400).json({
      ok: false,
      errores: ["El parámetro 'anio' es requerido y debe ser numérico"],
      datos: null,
    })
  }

  const anioNum = parseInt(anio, 10)
  const { desde, hasta } = rangoDelAnio(anioNum)

  const { data, error } = await supabase
    .from('gastos')
    .select('monto, fecha')
    .eq('user_id', req.userId)
    .gte('fecha', desde)
    .lt('fecha', hasta)

  if (error) {
    console.error('Supabase error:', error)
    return res.status(500).json({
      ok: false,
      errores: ['Error al leer de base de datos'],
      datos: null,
    })
  }

  const totales = Array(12).fill(0)
  for (const gasto of data) {
    // La columna es date, así que Supabase la devuelve como AAAA-MM-DD.
    const mes = mesDeIso(gasto.fecha)
    if (mes !== null) {
      totales[mes - 1] += gasto.monto
    }
  }

  return res.status(200).json({
    ok: true,
    anio,
    totales,
  })
})

// UptimeRobot pingea /health cada 5 min y evita que el free tier Render duerma tras 15 min de inactividad. Registrar la URL de la API en UptimeRobot (uptimerobot.com, gratis)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Golpea la base para evitar que Supabase pause el proyecto tras 7 días sin
// actividad (free tier). Con RLS activo no devuelve filas: basta con que la
// consulta llegue y vuelva sin error.
app.get('/health/db', async (req, res) => {
  try {
    const supabase = createAnonClient()
    const { error } = await supabase.from('gastos').select('id').limit(1)

    if (error) throw error
    res.status(200).json({ status: 'ok', db: 'connected' })
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message })
  }
})

// Puerto inyectado por Render en producción. Localmente usa 3000.
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
