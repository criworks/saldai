require('express-async-errors')

const cors = require('cors')
const express = require('express')

const { rutasDeGastos } = require('./rutas/gastos')
const { rutasDeSalud } = require('./rutas/salud')

/**
 * Arma la aplicación sin escucharla.
 *
 * `server.js` se queda con lo único que es del proceso: cargar la config y
 * abrir el puerto. Separarlo permite montar la app en un test y pegarle a una
 * ruta de verdad, que antes no se podía porque el archivo llamaba a `listen()`
 * al importarse.
 */
function crearApp({ origenesPermitidos, zona }) {
  const app = express()

  app.use(cors({ origin: origenesPermitidos }))
  app.use(express.json())

  app.use('/gastos', rutasDeGastos({ zona }))
  app.use('/health', rutasDeSalud())

  return app
}

module.exports = { crearApp }
