require('express-async-errors')

const cors = require('cors')
const express = require('express')
const helmet = require('helmet')

const { limitadores } = require('./middleware/limites')
const { manejadorDeErrores, noEncontrado } = require('./middleware/errores')
const { rutasDeGastos } = require('./rutas/gastos')
const { rutasDeSalud } = require('./rutas/salud')

/**
 * Arma la aplicación sin escucharla.
 *
 * `server.js` se queda con lo único que es del proceso: cargar la config y
 * abrir el puerto. Separarlo permite montar la app en un test y pegarle a una
 * ruta de verdad, que antes no se podía porque el archivo llamaba a `listen()`
 * al importarse.
 *
 * El orden de los middlewares importa: helmet y CORS antes que las rutas,
 * el 404 después de todas, y el manejador de errores al final de todo.
 */
function crearApp({ origenesPermitidos, zona, limites }) {
  const app = express()

  // Render termina TLS en su proxy, así que la IP del cliente llega en
  // `X-Forwarded-For`. Sin esto `req.ip` es la del proxy y todos los clientes
  // compartirían el mismo cupo del limitador. Es 1 y no `true` porque confiar
  // en toda la cadena deja que el cliente se invente la IP y esquive el límite.
  app.set('trust proxy', 1)

  app.use(helmet())
  app.use(cors({ origin: origenesPermitidos }))

  // El límite por defecto de express.json() es 100kb. Un gasto es una línea de
  // texto, así que 10kb ya es holgado y recorta el margen para mandar basura.
  app.use(express.json({ limit: '10kb' }))

  // Un solo juego de limitadores para toda la app: cada uno lleva su propio
  // contador, así gastar el cupo de una ruta no corta las otras.
  const limitadoresDePedidos = limitadores(limites)

  app.use('/gastos', rutasDeGastos({ zona, limites: limitadoresDePedidos }))
  app.use('/health', rutasDeSalud({ limites: limitadoresDePedidos }))

  app.use(noEncontrado)
  app.use(manejadorDeErrores)

  return app
}

module.exports = { crearApp }
