/**
 * Gasto Parser
 *
 * Formato esperado (delimitadores: , | - / ):
 *   MONTO, ITEM, CATEGORIA, FECHA, METODO
 *
 * Ejemplos válidos:
 *   "45000, café con cliente, ocio, ayer, tc"
 *   "1200 | uber | transporte | hoy | ef"
 *   "89990 - spotify - suscripciones"          ← fecha y método opcionales
 *   "15000/jumbo//ef"                           ← categoría vacía → se infiere del item
 *
 * Campos:
 * - MONTO:     requerido. Acepta $, puntos de miles y sufijo k. Ej: $1.200 | 1200 | 12k | 12.5k
 *              La coma no sirve de separador de miles: siempre parte campos.
 * - ITEM:      requerido. Nombre o descripción corta. Fallback para categorizar si categoría vacía.
 * - CATEGORIA: opcional. Keyword que matchea contra categorías conocidas.
 *              Si está presente → siempre gana (override).
 *              Si está vacía   → se infiere del item.
 * - FECHA:     opcional (default: hoy). Acepta: hoy, ayer, lunes, 15, 15/02, 15/02/2025
 * - METODO:    opcional (default: TC). Acepta: ef, efectivo, tc, tarjeta, crédito
 */

const { categorizar } = require('./categorizer')
const { parsearFecha } = require('./dateParser')

// Métodos de pago normalizados
const METODOS = {
  ef: 'EF',
  efectivo: 'EF',
  cash: 'EF',
  tc: 'TC',
  tarjeta: 'TC',
  credito: 'TC',
  crédito: 'TC',
  'tarjeta de credito': 'TC',
  'tarjeta de crédito': 'TC',
}

/**
 * Parsea un monto string a número entero CLP.
 *
 * Con sufijo k, el punto o la coma son separador decimal: "12.5k" son 12.500.
 * Sin sufijo, son separadores de miles: "$12.500" también son 12.500.
 */
function parsearMonto(raw) {
  const texto = raw.trim().replace(/^\$\s*/, '').replace(/\s/g, '')
  const invalido = { valor: 0, error: `Monto inválido: "${raw}"` }

  const conSufijoK = /^(\d+(?:[.,]\d+)?)k$/i.exec(texto)
  if (conSufijoK) {
    const valor = Math.round(parseFloat(conSufijoK[1].replace(',', '.')) * 1000)
    return valor > 0 ? { valor } : invalido
  }

  // Entero suelto, o grupos de miles bien formados: 45000 | 12.500 | 1.234.567
  if (!/^\d+$|^\d{1,3}(?:[.,]\d{3})+$/.test(texto)) {
    return invalido
  }

  const valor = parseInt(texto.replace(/[.,]/g, ''), 10)
  return valor > 0 ? { valor } : invalido
}

/**
 * Normaliza el método de pago.
 */
function parsearMetodo(raw) {
  if (!raw || !raw.trim()) {
    return { metodo: 'TC', advertencia: 'Método no especificado, se asumió TC' }
  }
  const limpio = raw.trim().toLowerCase()
  const metodo = METODOS[limpio]
  if (!metodo) {
    return { metodo: 'TC', advertencia: `Método "${raw}" no reconocido, se asumió TC` }
  }
  return { metodo }
}

/**
 * Resuelve la categoría final con la lógica de prioridad:
 *   1. Si categoriaRaw tiene contenido → matchear contra keywords → si coincide, usar esa
 *   2. Si categoriaRaw tiene contenido pero no matchea → advertir, intentar con item como fallback
 *   3. Si categoriaRaw está vacía → inferir del item
 *
 * @returns {{ categoria: string, fuente: "campo"|"item"|"ninguna", advertencia?: string }}
 */
function resolverCategoria(categoriaRaw, item) {
  const hayCategoria = categoriaRaw && categoriaRaw.trim().length > 0

  if (hayCategoria) {
    const resultado = categorizar(categoriaRaw.trim())
    if (resultado !== 'Sin categoría') {
      return { categoria: resultado, fuente: 'campo' }
    }
    // No matcheó: advertir y hacer fallback al item
    const resultadoItem = categorizar(item)
    if (resultadoItem !== 'Sin categoría') {
      return {
        categoria: resultadoItem,
        fuente: 'item',
        advertencia: `Categoría "${categoriaRaw}" no reconocida, se infirió del item: "${resultadoItem}"`,
      }
    }
    // Ninguno matcheó
    return {
      categoria: 'Sin categoría',
      fuente: 'ninguna',
      advertencia: `Categoría "${categoriaRaw}" no reconocida y el item tampoco permitió inferirla`,
    }
  }

  // Campo vacío → inferir del item
  const resultadoItem = categorizar(item)
  if (resultadoItem !== 'Sin categoría') {
    return { categoria: resultadoItem, fuente: 'item' }
  }

  return {
    categoria: 'Sin categoría',
    fuente: 'ninguna',
    advertencia: `No se pudo inferir categoría del item "${item}"`,
  }
}

/**
 * Divide el input por delimitadores.
 * Prioridad: coma > pipe > " - " > " / " > slash sin espacios > guion sin espacios
 */
function dividir(input) {
  if (input.includes(',')) return input.split(',').map(p => p.trim())
  if (input.includes('|')) return input.split('|').map(p => p.trim())
  if (/ - /.test(input)) return input.split(' - ').map(p => p.trim())
  if (/ \/ /.test(input)) return input.split(' / ').map(p => p.trim())
  if (/^\$?\d/.test(input) && input.includes('/')) return input.split('/').map(p => p.trim())
  if (/^\$?\d/.test(input) && /-/.test(input)) return input.split('-').map(p => p.trim())
  return [input.trim()]
}

/**
 * Parser principal.
 */
function parsearGasto(input) {
  const advertencias = []
  const errores = []

  if (!input || !input.trim()) {
    return { ok: false, errores: ['Input vacío'], advertencias: [], datos: null }
  }

  const partes = dividir(input.trim())

  if (partes.length < 2) {
    return {
      ok: false,
      errores: [
        'Se necesitan al menos 2 campos: MONTO e ITEM',
        `Input recibido: "${input}"`,
        'Ejemplo: "45000, café con cliente, ocio, ayer, tc"',
      ],
      advertencias: [],
      datos: null,
    }
  }

  // ── [0] MONTO ───────────────────────────────────────────────────
  const { valor: monto, error: errorMonto } = parsearMonto(partes[0])
  if (errorMonto) errores.push(errorMonto)

  // ── [1] ITEM ────────────────────────────────────────────────────
  const item = partes[1]?.trim() || ''
  if (!item) errores.push('Item vacío')

  // ── [2] CATEGORIA (opcional) ────────────────────────────────────
  const categoriaRaw = partes[2]?.trim() || ''
  const {
    categoria,
    fuente: categoriaSrc,
    advertencia: advCat,
  } = resolverCategoria(categoriaRaw, item)
  if (advCat) advertencias.push(advCat)

  // ── [3] FECHA (opcional) ────────────────────────────────────────
  const { fechaISO, fechaStr, advertencia: advFecha, error: errorFecha } = parsearFecha(partes[3])
  if (errorFecha) errores.push(errorFecha)
  if (advFecha) advertencias.push(advFecha)

  // ── [4] METODO (opcional) ───────────────────────────────────────
  const { metodo, advertencia: advMetodo } = parsearMetodo(partes[4])
  if (advMetodo) advertencias.push(advMetodo)

  // ── Formateo monto CLP ──────────────────────────────────────────
  const montoFormateado = monto.toLocaleString('es-CL')

  if (errores.length > 0) {
    return { ok: false, errores, advertencias, datos: null }
  }

  return {
    ok: true,
    errores: [],
    advertencias,
    datos: {
      monto,
      montoFormateado: `$${montoFormateado}`,
      item,
      categoria,
      categoriaSrc, // "campo" | "item" | "ninguna" — útil para debug/UI
      metodo,
      fecha: fechaISO, // AAAA-MM-DD, el formato que guarda la columna date
      fechaFormateada: fechaStr, // DD/MM/AAAA, para mostrar
    },
  }
}

module.exports = { parsearGasto }
