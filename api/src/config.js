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
  }
}

module.exports = { cargarConfig }
