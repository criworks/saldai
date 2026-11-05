const { esZonaValida } = require('@saldai/core')

/**
 * Validación del cuerpo de `PATCH /perfil/preferencias`.
 *
 * Funciones puras que devuelven `{ ok, errores, valor }`, igual que las de
 * gastos, para poder probarlas sin levantar el servidor.
 */

const bien = (valor) => ({ ok: true, errores: [], valor })
const mal = (errores) => ({ ok: false, errores, valor: null })

/**
 * Los campos que el usuario puede cambiar.
 *
 * `habilitado` no está: es el entitlement, o sea lo que decide el plan, no el
 * usuario. Si estuviera acá, cualquiera se prendería una función paga con un
 * PATCH. El día que haya plan pago lo escribe quien procese el pago, no esta
 * ruta.
 */
const CAMPOS_BOOLEANOS = ['categoriasActivo', 'metodosActivo']

/** De camelCase (el contrato HTTP) a snake_case (la tabla). */
const COLUMNA = {
  categoriasActivo: 'categorias_activo',
  metodosActivo: 'metodos_activo',
  zona: 'zona',
}

/**
 * Valida el cuerpo y devuelve ya traducido a columnas, listo para el upsert.
 *
 * Un cuerpo vacío es un error y no un no-op: un PATCH que no cambia nada casi
 * siempre es un campo mal escrito del lado del cliente, y responder 200 lo
 * esconde.
 */
function validarPreferencias(cuerpo) {
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
    return mal(['El cuerpo debe ser un objeto'])
  }

  const errores = []
  const valor = {}

  for (const campo of CAMPOS_BOOLEANOS) {
    if (cuerpo[campo] === undefined) continue
    if (typeof cuerpo[campo] !== 'boolean') {
      errores.push(`El campo '${campo}' debe ser true o false`)
      continue
    }
    valor[COLUMNA[campo]] = cuerpo[campo]
  }

  if (cuerpo.zona !== undefined) {
    // `null` es un valor válido y significa "volvé a usar la del dispositivo".
    if (cuerpo.zona === null) {
      valor.zona = null
    } else if (typeof cuerpo.zona !== 'string' || !esZonaValida(cuerpo.zona)) {
      // Acá sí se rechaza, al revés que al registrar un movimiento, donde una
      // zona desconocida advierte y cae al default. Son dos situaciones
      // distintas: allá el usuario quiere guardar un gasto y la zona es un
      // detalle del aparato, acá la zona *es* lo que pidió cambiar, y guardar
      // en silencio otra cosa es peor que decirle que no se pudo.
      errores.push(`La zona '${cuerpo.zona}' no es una zona horaria IANA válida`)
    } else {
      valor.zona = cuerpo.zona
    }
  }

  const desconocidos = Object.keys(cuerpo).filter(
    (clave) => !CAMPOS_BOOLEANOS.includes(clave) && clave !== 'zona'
  )
  if (desconocidos.length > 0) {
    errores.push(`Campos no reconocidos: ${desconocidos.join(', ')}`)
  }

  if (errores.length > 0) return mal(errores)
  if (Object.keys(valor).length === 0) return mal(['No se envió ningún campo para cambiar'])

  return bien(valor)
}

module.exports = { validarPreferencias }
