/**
 * Qué cuenta como emoji en el campo del icono de una categoría.
 *
 * Se comprueba por rangos de code point y no con `\p{Extended_Pictographic}`,
 * que es la forma corta: las clases de propiedad Unicode en expresiones
 * regulares no están en todas las versiones de Hermes, y donde faltan la
 * expresión no falla al evaluarse sino al construirse, o sea al cargar el
 * módulo, que se lleva la pantalla entera. Los rangos funcionan en cualquier
 * motor.
 *
 * Los rangos cubren los bloques de pictogramas, los símbolos y los
 * dingbats. No pretenden ser la lista exacta de emojis de Unicode: el campo no
 * decide qué es un emoji de verdad, solo evita que alguien escriba una palabra
 * donde va un icono.
 */
const RANGOS: ReadonlyArray<readonly [number, number]> = [
  [0x1f000, 0x1faff], // Pictogramas: caras, objetos, animales, banderas, símbolos nuevos
  [0x1f1e6, 0x1f1ff], // Indicadores regionales, los que forman las banderas de países
  [0x2600, 0x27bf], // Símbolos misceláneos y dingbats (☕, ✅, ✈)
  [0x2b00, 0x2bff], // Flechas y formas
  [0x3030, 0x303d],
  [0x3297, 0x3299],
  [0xfe0f, 0xfe0f], // Selector de variación: el que vuelve emoji a un símbolo de texto
  [0x200d, 0x200d], // Zero width joiner: el que une ojos y caras en un emoji compuesto
  [0x20e3, 0x20e3], // Keycap, el recuadro de 1️⃣
  [0x1f3fb, 0x1f3ff], // Tonos de piel
]

function esCodePointDeEmoji(punto: number): boolean {
  return RANGOS.some(([desde, hasta]) => punto >= desde && punto <= hasta)
}

/** `true` si todo lo escrito es emoji y hay al menos un carácter. */
export function esSoloEmoji(texto: string): boolean {
  if (!texto) return false
  for (const caracter of texto) {
    const punto = caracter.codePointAt(0)
    if (punto === undefined || !esCodePointDeEmoji(punto)) return false
  }
  return true
}

/**
 * Deja pasar solo el primer emoji de lo que se escribió, y nada si no hay
 * ninguno.
 *
 * Se filtra en vez de rechazar porque el teclado del sistema no se puede
 * limitar a emojis: el usuario puede escribir una letra, y lo que tiene que
 * pasar entonces es que el campo no se mueva, no que aparezca un error.
 *
 * Toma el primero y no todos porque el icono de una categoría es uno: pegar
 * tres emojis desde el portapapeles deja el primero. Un emoji compuesto
 * (familia, bandera, tono de piel) es varios code point unidos por ZWJ o por un
 * selector, así que se toma el grupo entero y no su primera pieza, que sería
 * otro emoji distinto.
 */
export function soloElPrimerEmoji(texto: string): string {
  const caracteres = [...(texto ?? '')]
  const inicio = caracteres.findIndex((c) => {
    const punto = c.codePointAt(0)
    // El ZWJ, el selector de variación y el tono de piel no empiezan un emoji:
    // modifican el anterior.
    return punto !== undefined && esCodePointDeEmoji(punto) && !esModificador(punto)
  })
  if (inicio === -1) return ''

  let fin = inicio + 1
  while (fin < caracteres.length) {
    const punto = caracteres[fin].codePointAt(0)
    if (punto === undefined) break
    if (esModificador(punto)) {
      fin += 1
      continue
    }
    // Después de un ZWJ viene otra pieza del mismo emoji compuesto.
    const anterior = caracteres[fin - 1].codePointAt(0)
    if (anterior === 0x200d && esCodePointDeEmoji(punto)) {
      fin += 1
      continue
    }
    break
  }

  return caracteres.slice(inicio, fin).join('')
}

function esModificador(punto: number): boolean {
  return punto === 0x200d || punto === 0xfe0f || punto === 0x20e3 || (punto >= 0x1f3fb && punto <= 0x1f3ff)
}
