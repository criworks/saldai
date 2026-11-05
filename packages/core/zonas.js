/**
 * El catálogo de zonas horarias que se le ofrece al usuario.
 *
 * La lista está escrita acá y no se pide al motor con
 * `Intl.supportedValuesOf('timeZone')` por dos razones. La primera es que ese
 * método no está en todas las versiones de Hermes, que es el motor de mobile:
 * donde falta, el selector quedaría vacío sin dar error. La segunda es que,
 * donde sí está, devuelve más de cuatrocientos nombres, muchos de ellos alias
 * históricos ("US/Pacific", "Etc/GMT+7"), y la lista terminaría siendo distinta
 * en el teléfono y en la API. Con una lista propia las dos ven lo mismo.
 *
 * Los desplazamientos no se guardan: se calculan con `Intl` en el momento,
 * porque cambian con el horario de verano y una tabla escrita a mano queda
 * vieja dos veces al año.
 */

/**
 * Las zonas que se muestran, una por región poblada. No es la base de datos
 * IANA completa: es una zona por offset y país relevante, que es lo que
 * alguien busca cuando quiere decir dónde está.
 */
const ZONAS = Object.freeze([
  // América
  'America/Anchorage',
  'America/Argentina/Buenos_Aires',
  'America/Asuncion',
  'America/Bogota',
  'America/Caracas',
  'America/Chicago',
  'America/Costa_Rica',
  'America/Denver',
  'America/Guatemala',
  'America/Guayaquil',
  'America/Halifax',
  'America/Havana',
  'America/La_Paz',
  'America/Lima',
  'America/Los_Angeles',
  'America/Managua',
  'America/Mexico_City',
  'America/Montevideo',
  'America/Monterrey',
  'America/New_York',
  'America/Panama',
  'America/Phoenix',
  'America/Puerto_Rico',
  'America/Santiago',
  'America/Santo_Domingo',
  'America/Sao_Paulo',
  'America/St_Johns',
  'America/Tijuana',
  'America/Toronto',
  'America/Vancouver',
  'Atlantic/Reykjavik',
  'Pacific/Easter',
  'Pacific/Galapagos',
  'Pacific/Honolulu',

  // Europa y África
  'Africa/Abidjan',
  'Africa/Algiers',
  'Africa/Cairo',
  'Africa/Casablanca',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Tunis',
  'Atlantic/Canary',
  'Europe/Amsterdam',
  'Europe/Athens',
  'Europe/Berlin',
  'Europe/Brussels',
  'Europe/Bucharest',
  'Europe/Budapest',
  'Europe/Copenhagen',
  'Europe/Dublin',
  'Europe/Helsinki',
  'Europe/Istanbul',
  'Europe/Kyiv',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Moscow',
  'Europe/Oslo',
  'Europe/Paris',
  'Europe/Prague',
  'Europe/Rome',
  'Europe/Stockholm',
  'Europe/Vienna',
  'Europe/Warsaw',
  'Europe/Zurich',

  // Asia y Oceanía
  'Asia/Almaty',
  'Asia/Baghdad',
  'Asia/Bangkok',
  'Asia/Beirut',
  'Asia/Dhaka',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Jakarta',
  'Asia/Jerusalem',
  'Asia/Kabul',
  'Asia/Karachi',
  'Asia/Kathmandu',
  'Asia/Kolkata',
  'Asia/Kuala_Lumpur',
  'Asia/Manila',
  'Asia/Riyadh',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Taipei',
  'Asia/Tashkent',
  'Asia/Tehran',
  'Asia/Tokyo',
  'Asia/Yangon',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Darwin',
  'Australia/Melbourne',
  'Australia/Perth',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Pacific/Fiji',
  'Pacific/Guam',
  'Pacific/Port_Moresby',
  'Pacific/Tongatapu',

  // UTC, para quien no quiere ninguna de las anteriores.
  'UTC',
])

/**
 * Minutos que la zona está adelantada respecto de UTC, o `null` si el motor no
 * conoce la zona.
 *
 * Se calcula formateando un instante en la zona y volviéndolo a leer como si
 * fuera UTC: la diferencia entre los dos es el desplazamiento. Es el mismo
 * `Intl.DateTimeFormat` con `timeZone` que ya usa `hoyCivil`, así que no pide
 * nada que el bundle de mobile no esté usando. `timeZoneName: 'longOffset'`
 * sería más directo pero no está en todas las versiones de Hermes.
 */
function desplazamientoDeZona(zona, instante = new Date()) {
  // `timeZone: undefined` no tira: significa "la zona del sistema", así que sin
  // este guardia una zona ausente devolvería el desplazamiento del aparato en
  // vez de "no sé".
  if (typeof zona !== 'string' || !zona.trim()) return null

  try {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: zona,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(instante)

    const valor = (tipo) => {
      const parte = partes.find((p) => p.type === tipo)
      return parte ? parseInt(parte.value, 10) : NaN
    }

    // Con `hour12: false` hay motores que devuelven 24 para la medianoche.
    const hora = valor('hour') === 24 ? 0 : valor('hour')
    const leido = Date.UTC(valor('year'), valor('month') - 1, valor('day'), hora, valor('minute'), valor('second'))
    if (Number.isNaN(leido)) return null

    // El instante se trunca al segundo porque `leido` no tiene milisegundos.
    const alSegundo = instante.getTime() - instante.getMilliseconds()
    return Math.round((leido - alSegundo) / 60000)
  } catch {
    return null
  }
}

/** -180 → "(UTC-03:00)". `null` → "". */
function etiquetaDeDesplazamiento(minutos) {
  if (!Number.isFinite(minutos)) return ''
  const signo = minutos < 0 ? '-' : '+'
  const absoluto = Math.abs(minutos)
  const horas = String(Math.floor(absoluto / 60)).padStart(2, '0')
  const resto = String(absoluto % 60).padStart(2, '0')
  return `(UTC${signo}${horas}:${resto})`
}

/** "America/Argentina/Buenos_Aires" → "Buenos Aires, Argentina". */
function nombreDeZona(zona) {
  const partes = String(zona).split('/')
  if (partes.length === 1) return partes[0].replace(/_/g, ' ')
  const ciudad = partes[partes.length - 1].replace(/_/g, ' ')
  const region = partes.length > 2 ? partes[1].replace(/_/g, ' ') : ''
  return region ? `${ciudad}, ${region}` : ciudad
}

/**
 * El catálogo listo para mostrar: nombre, desplazamiento y su etiqueta,
 * ordenado de oeste a este y, dentro del mismo desplazamiento, alfabético.
 *
 * Las zonas que el motor no conoce quedan fuera en vez de aparecer sin
 * desplazamiento: una fila que diga "(UTC)" por error es peor que no estar.
 */
function catalogoDeZonas(instante = new Date()) {
  return ZONAS.map((zona) => {
    const minutos = desplazamientoDeZona(zona, instante)
    return minutos === null
      ? null
      : { zona, nombre: nombreDeZona(zona), minutos, desplazamiento: etiquetaDeDesplazamiento(minutos) }
  })
    .filter(Boolean)
    .sort((a, b) => a.minutos - b.minutos || a.nombre.localeCompare(b.nombre))
}

/** Quita tildes y pasa a minúsculas, para que "cordoba" encuentre "Córdoba". */
function plegar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Filtra el catálogo por lo que escribió el usuario. Busca en el nombre
 * mostrado, en el nombre IANA y en el desplazamiento, así que "madrid",
 * "Europe" y "+01" encuentran todos algo. Sin texto devuelve todo.
 */
function buscarZonas(texto, catalogo) {
  const aguja = plegar(texto)
  if (!aguja) return catalogo
  return catalogo.filter(
    (z) =>
      plegar(z.nombre).includes(aguja) ||
      plegar(z.zona).includes(aguja) ||
      plegar(z.desplazamiento).includes(aguja)
  )
}

module.exports = {
  ZONAS,
  buscarZonas,
  catalogoDeZonas,
  desplazamientoDeZona,
  etiquetaDeDesplazamiento,
  nombreDeZona,
}
