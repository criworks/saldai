/**
 * Verifica el formato de los CHANGELOG del monorepo.
 *
 * Por qué existe: el formato se escribió mal durante meses sin que nada lo
 * marcara. `mobile/CHANGELOG.md` terminó con versiones fuera de orden,
 * siete secciones `### Added` y `### Changed` repetidas dentro de una misma
 * versión, `\n` literales en vez de saltos de línea y un segundo encabezado
 * `# Changelog` en medio del archivo. Un archivo de texto que nadie valida se
 * degrada solo.
 *
 * Qué NO hace: tocar el pasado. La regla del repo es que una entrada ya escrita
 * no se modifica ni se borra, así que lo que está debajo del separador
 * `## Histórico (formato previo)` queda fuera de la verificación. El check mira
 * solo de ahí para arriba, que es donde van las entradas nuevas.
 */

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const raiz = path.resolve(import.meta.dirname, '..')

const ARCHIVOS = ['CHANGELOG.md', 'mobile/CHANGELOG.md', 'web/CHANGELOG.md']

const SEPARADOR_HISTORICO = '## Histórico (formato previo)'

// Las seis secciones de Keep a Changelog. No se aceptan otras: una sección
// inventada es una entrada que nadie va a encontrar después.
const SECCIONES = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security']

const VERSION = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$/
const NO_LIBERADO = /^## \[Unreleased\]$/

/** 1.10.2 -> [1, 10, 2], para comparar como números y no como texto. */
const partes = (v) => v.split('.').map(Number)

function comparar(a, b) {
  const [x, y] = [partes(a), partes(b)]
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]
  return 0
}

const problemas = []

for (const archivo of ARCHIVOS) {
  const ruta = path.join(raiz, archivo)
  if (!existsSync(ruta)) {
    problemas.push([archivo, null, 'el archivo no existe'])
    continue
  }

  const todas = readFileSync(ruta, 'utf8').split('\n')

  // Solo lo que está arriba del separador: el histórico no se verifica.
  const corte = todas.findIndex((l) => l.trim() === SEPARADOR_HISTORICO)
  const lineas = corte === -1 ? todas : todas.slice(0, corte)

  const reportar = (i, mensaje) => problemas.push([archivo, i + 1, mensaje])

  let versionActual = null // null = todavía no empezó ninguna versión
  let ultimaLiberada = null
  let seccionesVistas = new Set()
  let vioNoLiberado = false

  for (const [i, linea] of lineas.entries()) {
    if (linea.includes('\\n')) {
      reportar(i, 'tiene un `\\n` literal en vez de un salto de línea de verdad')
    }

    if (linea.startsWith('# ') && i > 0) {
      reportar(i, `encabezado de nivel 1 en medio del archivo: ${linea.trim()}`)
      continue
    }

    if (linea.startsWith('## ')) {
      seccionesVistas = new Set()

      if (NO_LIBERADO.test(linea)) {
        if (vioNoLiberado) reportar(i, '`## [Unreleased]` aparece más de una vez')
        if (ultimaLiberada) {
          reportar(i, '`## [Unreleased]` tiene que ir arriba de todas las versiones')
        }
        vioNoLiberado = true
        versionActual = 'Unreleased'
        continue
      }

      const coincide = linea.match(VERSION)
      if (!coincide) {
        reportar(
          i,
          `encabezado de versión mal formado: ${linea.trim()}\n` +
            '      tiene que ser exactamente `## [x.y.z] - AAAA-MM-DD`',
        )
        versionActual = null
        continue
      }

      const [, version, fecha] = coincide
      if (Number.isNaN(Date.parse(fecha))) {
        reportar(i, `la fecha de [${version}] no es una fecha válida: ${fecha}`)
      }
      if (ultimaLiberada && comparar(version, ultimaLiberada.version) >= 0) {
        reportar(
          i,
          `[${version}] está debajo de [${ultimaLiberada.version}]; ` +
            'las versiones van de la más nueva a la más vieja',
        )
      }
      versionActual = version
      ultimaLiberada = { version, fecha }
      continue
    }

    if (linea.startsWith('### ')) {
      const nombre = linea.slice(4).trim()

      if (!versionActual) {
        reportar(i, `\`### ${nombre}\` no está dentro de ninguna versión`)
        continue
      }
      if (!SECCIONES.includes(nombre)) {
        reportar(
          i,
          `sección desconocida \`### ${nombre}\` en [${versionActual}]\n` +
            `      las únicas válidas son: ${SECCIONES.join(', ')}`,
        )
        continue
      }
      if (seccionesVistas.has(nombre)) {
        reportar(
          i,
          `\`### ${nombre}\` aparece dos veces en [${versionActual}]; ` +
            'las entradas van todas en la misma sección',
        )
        continue
      }
      seccionesVistas.add(nombre)
    }
  }
}

if (problemas.length === 0) {
  console.log(`Formato correcto en los ${ARCHIVOS.length} CHANGELOG.`)
  process.exit(0)
}

console.error('Hay CHANGELOG que no respetan el formato.\n')
let ultimoArchivo = null
for (const [archivo, linea, mensaje] of problemas) {
  if (archivo !== ultimoArchivo) {
    console.error(`  ${archivo}`)
    ultimoArchivo = archivo
  }
  console.error(`    ${linea ? `línea ${linea}: ` : ''}${mensaje}`)
}
console.error(
  '\nFormato: `## [x.y.z] - AAAA-MM-DD`, y debajo solo `### Added`, `### Changed`,\n' +
    '`### Deprecated`, `### Removed`, `### Fixed` o `### Security`, una vez cada una.\n' +
    'Lo que está debajo de `## Histórico (formato previo)` no se verifica y no se corrige.',
)
process.exit(1)
