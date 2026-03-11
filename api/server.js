require('dotenv').config()

const { requireAuth } = require('./src/middleware/auth.js')
const express = require('express')
const cors = require('cors')
const { parsearGasto } = require('./src/parser')
const supabase = require('./src/supabase')

const app = express()
const PORT = process.env.PORT || 3000

const FRONTEND_DEPLOY_URL = process.env.NEXT_FRONTEND_DEPLOY_URL
const FRONTEND_LOCAL_URL = process.env.NEXT_FRONTEND_LOCAL_URL

app.use(cors({ origin: [FRONTEND_DEPLOY_URL, FRONTEND_LOCAL_URL] }))
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

  const resultado = parsearGasto(input)
  return res.status(resultado.ok ? 200 : 422).json(resultado)
})

// ── POST /gastos ─ Ruta protegida ───────────────────────────────────────────────────────────
app.post('/gastos', requireAuth, async (req, res) => {
  const { input } = req.body

  if (!input || typeof input !== 'string') {
    return res.status(400).json({
      ok: false,
      errores: ["El campo 'input' es requerido y debe ser un string"],
      advertencias: [],
      datos: null,
    })
  }

  const resultado = parsearGasto(input)

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
      user_id: req.user.sub,
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
  const { mes, categoria } = req.query

  let query = supabase.from('gastos').select('*').eq('user_id', req.user.sub).order('creado_en', { ascending: false })

  if (mes) {
    const mesNum = parseInt(mes, 10)
    if (isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
      return res.status(400).json({
        ok: false,
        errores: ["El parámetro 'mes' debe ser un número entre 1 y 12"],
        datos: null,
      })
    }
    const mesPad = String(mesNum).padStart(2, '0')
    query = query.ilike('fecha', `%/${mesPad}/%`)
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

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
