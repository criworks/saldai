/**
 * La forma de las preferencias en el contrato HTTP, y sus defaults.
 *
 * Los defaults están además en el schema, como `default` de cada columna. Acá
 * se repiten porque hasta el primer guardado **no hay fila**, y la API tiene
 * que responder algo: sin esto, cada pantalla elegiría su propio "si no hay
 * dato, asumo que...", que es como se terminan viendo cosas distintas en dos
 * lugares de la app. Si cambia un default, cambian los dos lados, y hay un test
 * que fija cuáles son.
 */

const DEFAULTS = {
  categorias_habilitado: true,
  categorias_activo: false,
  metodos_habilitado: true,
  metodos_activo: false,
  zona: null,
}

/**
 * De la fila (o de nada) al objeto que devuelve la API.
 *
 * `habilitado` y `activo` van anidados por flag a propósito: la diferencia
 * entre "puede" y "quiere" es la decisión de diseño de esta tabla, y aplanarlos
 * a `categoriasActivo` suelto la esconde justo en la capa que mira quien
 * consume la API.
 */
function conDefaults(fila) {
  const f = { ...DEFAULTS, ...(fila || {}) }

  return {
    categorias: { habilitado: f.categorias_habilitado, activo: f.categorias_activo },
    metodos: { habilitado: f.metodos_habilitado, activo: f.metodos_activo },
    zona: f.zona ?? null,
  }
}

module.exports = { DEFAULTS, conDefaults }
