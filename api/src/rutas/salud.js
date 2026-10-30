const express = require('express')

const { createAnonClient } = require('../supabase')

/**
 * Los dos health checks, que existen por el free tier y no por la app:
 * UptimeRobot pinguea `/health` cada 5 minutos para que Render no duerma el
 * servicio tras 15 minutos sin tráfico, y `/health/db` golpea la base para que
 * Supabase no pause el proyecto tras 7 días sin actividad.
 */
function rutasDeSalud() {
  const router = express.Router()

  router.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Con RLS activo no devuelve filas: basta con que la consulta llegue y
  // vuelva sin error.
  router.get('/db', async (req, res) => {
    try {
      const supabase = createAnonClient()
      const { error } = await supabase.from('gastos').select('id').limit(1)

      if (error) throw error
      res.status(200).json({ status: 'ok', db: 'connected' })
    } catch (err) {
      res.status(500).json({ status: 'error', message: err.message })
    }
  })

  return router
}

module.exports = { rutasDeSalud }
