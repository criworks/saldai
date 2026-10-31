/**
 * Configuración y validación de variables de entorno.
 *
 * Se ejecuta al arrancar: si falta algo requerido, el proceso no levanta.
 * Así el error aparece en el log del deploy y no como un 500 en producción.
 */

const REQUERIDAS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY']

// Opcionales, pero conviene avisar si faltan porque degradan funcionalidad.
const OPCIONALES = {
  NEXT_FRONTEND_DEPLOY_URL: 'la web desplegada no podrá llamar a la API (CORS)',
  NEXT_FRONTEND_LOCAL_URL: 'la web local no podrá llamar a la API (CORS)',
  RESEND_API_KEY: 'no se enviarán correos',
  SENTRY_DSN: 'los errores no se reportan a ningún lado, solo quedan en el log',
}

// Pedidos por minuto y por IP. `parsear` no pide sesión, así que es el que
// cualquiera puede llamar en loop; las rutas con sesión van más suelto porque
// la app hace varias por pantalla.
const LIMITES_POR_DEFECTO = {
  porMinutoSinSesion: 30,
  porMinutoConSesion: 120,
  // El keep-alive corre cada varios minutos; esto es holgado y acotado.
  porMinutoSalud: 10,
}

/** Lee un entero de una variable de entorno, o devuelve el default. */
function entero(valor, porDefecto) {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : porDefecto
}

function cargarConfig() {
  const faltantes = REQUERIDAS.filter(clave => !process.env[clave])

  if (faltantes.length > 0) {
    throw new Error(`Faltan variables de entorno requeridas: ${faltantes.join(', ')}`)
  }

  for (const [clave, consecuencia] of Object.entries(OPCIONALES)) {
    if (!process.env[clave]) {
      console.warn(`⚠ ${clave} no configurada: ${consecuencia}`)
    }
  }

  // Orígenes permitidos por CORS. Se filtran los undefined para no dejar
  // entradas vacías que confundan al middleware.
  const origenesPermitidos = [
    process.env.NEXT_FRONTEND_DEPLOY_URL,
    process.env.NEXT_FRONTEND_LOCAL_URL,
  ].filter(Boolean)

  return {
    puerto: process.env.PORT || 3000,
    origenesPermitidos,
    // El dominio no lee variables de entorno, así que la zona se resuelve acá
    // y se le pasa en cada llamada. Render corre en UTC.
    zona: process.env.APP_TIMEZONE || 'America/Santiago',
    limites: {
      porMinutoSinSesion: entero(
        process.env.LIMITE_SIN_SESION,
        LIMITES_POR_DEFECTO.porMinutoSinSesion,
      ),
      porMinutoConSesion: entero(
        process.env.LIMITE_CON_SESION,
        LIMITES_POR_DEFECTO.porMinutoConSesion,
      ),
      porMinutoSalud: entero(process.env.LIMITE_SALUD, LIMITES_POR_DEFECTO.porMinutoSalud),
    },
    sentry: {
      dsn: process.env.SENTRY_DSN,
      entorno: process.env.NODE_ENV || 'development',
    },
  }
}

module.exports = { cargarConfig }
