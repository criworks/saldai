/**
 * Sentry, opcional.
 *
 * Hasta ahora un 500 en producción solo existía en el log de Render, que se
 * mira cuando alguien ya se dio cuenta de que algo anda mal. El bug de auth que
 * dejó la API caída seis meses es exactamente eso: nadie estaba mirando.
 *
 * Es opcional a propósito: sin `SENTRY_DSN` la API arranca igual y `capturar()`
 * no hace nada, así que el proyecto corre en local y los tests no mandan nada a
 * ninguna parte. No es un `if` que haya que recordar en cada llamada.
 */

let sentry = null

/**
 * Arranca Sentry si hay DSN. Se llama lo más temprano posible en `server.js`,
 * antes de armar la app, porque la instrumentación de Sentry envuelve módulos
 * como `http` al inicializarse.
 */
function iniciarObservabilidad({ dsn, entorno }) {
  if (!dsn) return false

  // El require va acá adentro: sin DSN el paquete ni se carga.
  sentry = require('@sentry/node')
  sentry.init({
    dsn,
    environment: entorno,
    // Sin trazas de performance: lo que hace falta es saber que algo explotó.
    tracesSampleRate: 0,
    // El cuerpo de un request trae el gasto que la persona escribió, que es
    // dato suyo y no hace falta para arreglar un stack trace.
    sendDefaultPii: false,
  })

  return true
}

/** Manda un error a Sentry si está configurado. Si no, no hace nada. */
function capturar(error) {
  if (!sentry) return
  try {
    sentry.captureException(error)
  } catch (err) {
    // Que falle el reporte de un error no puede tumbar el request.
    console.error('No se pudo reportar a Sentry:', err)
  }
}

module.exports = { capturar, iniciarObservabilidad }
