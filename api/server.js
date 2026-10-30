require('dotenv').config()

const { cargarConfig } = require('./src/config')
const { iniciarObservabilidad } = require('./src/observabilidad')

const { puerto, origenesPermitidos, zona, limites, sentry } = cargarConfig()

// Antes de armar la app: la instrumentación de Sentry envuelve módulos como
// `http` al inicializarse, así que tiene que correr primero. Sin DSN no hace
// nada y devuelve false.
if (iniciarObservabilidad(sentry)) {
  console.log('Sentry activo')
}

const { crearApp } = require('./src/app')

const app = crearApp({ origenesPermitidos, zona, limites })

// Puerto inyectado por Render en producción. Localmente usa 3000.
app.listen(puerto, () => {
  console.log(`Servidor corriendo en http://localhost:${puerto}`)
})
