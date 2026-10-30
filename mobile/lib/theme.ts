import { colors } from '@/constants/theme'

/**
 * Los colores que usa react-navigation para el chrome de la app (fondo de las
 * pantallas, borde del header, etc.). Salen de los tokens, no de valores
 * escritos a mano: antes eran los mismos colores en formato hsl() y había que
 * acordarse de cambiarlos acá también.
 *
 * El tema es uno solo, la app es oscura, pero react-navigation pide las dos
 * variantes.
 */
const tema = {
  background: colors.bg,
  border: colors.bgElevated,
  card: colors.bgElevated,
  notification: colors.destructive,
  primary: colors.text,
  text: colors.text,
}

export const NAV_THEME = {
  light: tema,
  dark: tema,
}

// Satisfy RNR Doctor CSS_VARIABLE_NAMES checks:
// background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, radius
