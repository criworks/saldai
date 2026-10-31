/**
 * Verifica que todo archivo que escribe clases de Tailwind esté cubierto por
 * los globs de `content` en tailwind.config.js.
 *
 * Por qué existe: Tailwind solo genera las clases que encuentra en los archivos
 * que escanea. Una carpeta fuera de `content` **no da ningún error**: las clases
 * no se generan y el componente queda sin estilos. No lo agarra el typecheck
 * (son strings), no lo agarran los tests, y `expo export` compila igual.
 *
 * Pasó de verdad: el PR #57 movió componentes a `features/` y dejó los globs
 * apuntando a `components/`. El menú principal perdió su posicionamiento y los
 * botones sus paddings, y se descubrió mirando la app, no en CI.
 */

import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'

const raiz = path.resolve(import.meta.dirname, '..')

// Los globs declarados, reducidos a la carpeta raíz de cada uno:
// "./features/**/*.{js,jsx,ts,tsx}" -> "features"
const config = readFileSync(path.join(raiz, 'tailwind.config.js'), 'utf8')
const bloque = config.match(/content:\s*\[([\s\S]*?)\]/)
if (!bloque) {
  console.error('No pude encontrar el array `content` en tailwind.config.js.')
  process.exit(1)
}
const cubiertas = new Set(
  [...bloque[1].matchAll(/["']\.\/([^/"']+)\//g)].map((m) => m[1]),
)

// Los archivos que realmente escriben clases.
const archivos = execSync("git ls-files 'mobile/*.ts' 'mobile/*.tsx'", {
  cwd: path.resolve(raiz, '..'),
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)
  .map((f) => f.replace(/^mobile\//, ''))

const descubiertos = new Map()
for (const archivo of archivos) {
  const texto = readFileSync(path.join(raiz, archivo), 'utf8')
  if (!texto.includes('className=')) continue

  const carpeta = archivo.split('/')[0]
  if (cubiertas.has(carpeta)) continue

  if (!descubiertos.has(carpeta)) descubiertos.set(carpeta, [])
  descubiertos.get(carpeta).push(archivo)
}

if (descubiertos.size === 0) {
  console.log('Los globs de `content` cubren todos los archivos con clases.')
  process.exit(0)
}

console.error('Hay archivos con clases de Tailwind fuera de `content`.')
console.error('Sus clases NO se generan y los componentes se ven sin estilos.\n')
for (const [carpeta, lista] of descubiertos) {
  console.error(`  ${carpeta}/ (${lista.length} archivo${lista.length > 1 ? 's' : ''})`)
  for (const f of lista.slice(0, 5)) console.error(`    ${f}`)
  if (lista.length > 5) console.error(`    ...y ${lista.length - 5} más`)
}
console.error('\nAgregá en mobile/tailwind.config.js, dentro de `content`:')
for (const carpeta of descubiertos.keys()) {
  console.error(`  "./${carpeta}/**/*.{js,jsx,ts,tsx}",`)
}
process.exit(1)
