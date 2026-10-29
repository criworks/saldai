/**
 * Montos en pesos chilenos.
 *
 * El peso no usa decimales y el separador de miles es el punto, así que
 * "$12.500" es lo correcto y "$12,500.00" no. Cada interfaz formateaba por su
 * cuenta y los mocks de mobile mostraban el formato gringo.
 */

const LOCALE = 'es-CL'

/** 12500 → "12.500" */
function formatearNumero(monto) {
  const valor = Number(monto)
  if (!Number.isFinite(valor)) return '0'
  return Math.round(valor).toLocaleString(LOCALE)
}

/** 12500 → "$12.500" */
function formatearMonto(monto) {
  return `$${formatearNumero(monto)}`
}

module.exports = { LOCALE, formatearNumero, formatearMonto }
