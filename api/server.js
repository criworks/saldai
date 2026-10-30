require('dotenv').config()

const { crearApp } = require('./src/app')
const { cargarConfig } = require('./src/config')

const { puerto, origenesPermitidos, zona } = cargarConfig()

const app = crearApp({ origenesPermitidos, zona })

// Puerto inyectado por Render en producción. Localmente usa 3000.
app.listen(puerto, () => {
  console.log(`Servidor corriendo en http://localhost:${puerto}`)
})
