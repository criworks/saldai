/**
 * Design Tokens — Expenses Tracker
 *
 * Fuente única de verdad para colores, tipografía, spacing y constantes de UI.
 * Usado por web/ (Tailwind CSS), mobile/ (NativeWind) y cualquier paquete futuro.
 */

export const colors = {
  // Fondos
  bg:           "#111217",
  bgElevated:   "#262A35",
  bgSubtle:     "#1a1a1a",

  // Bordes
  border:       "#1a1a1a",
  borderMuted:  "#222222",
  borderActive: "#555555",

  // Texto
  text:         "#ffffff",
  textMuted:    "#60677D",
  textDisabled: "#2a2a2a",

  // Estados
  success:  "#4a7c59",
  error:    "#a65b5b",
  warning:  "#8a6d3b",

  // Categorías
  cat: {
    basicos:       "#4a7c59",
    suscripciones: "#5b6fa6",
    mercado:       "#8a6d3b",
    inversion:     "#6b5b95",
    ocio:          "#a65b5b",
    delivery:      "#a67c52",
    transporte:    "#4a7a8a",
    sinCategoria:  "#444444",
  },
};

// Lookup dinámico de color por nombre de categoría
export const categoryColor = (categoria) => {
  const map = {
    "Básicos":       colors.cat.basicos,
    "Suscripciones": colors.cat.suscripciones,
    "Mercado":       colors.cat.mercado,
    "Inversión":     colors.cat.inversion,
    "Ocio":          colors.cat.ocio,
    "Delivery":      colors.cat.delivery,
    "Transporte":    colors.cat.transporte,
  };
  return map[categoria] ?? colors.cat.sinCategoria;
};

// Emojis por categoría
export const EMOJIS_CAT = {
  "Básicos":       "🏠",
  "Mercado":       "🛒",
  "Suscripciones": "💳",
  "Transporte":    "🚌",
  "Ocio":          "☕️",
  "Delivery":      "💣",
  "Inversión":     "🌱",
  "Sin categoría": "💸",
};

// Colores por categoría (Record compatible con TS)
export const COLORES_CAT = {
  "Básicos":       colors.cat.basicos,
  "Suscripciones": colors.cat.suscripciones,
  "Mercado":       colors.cat.mercado,
  "Inversión":     colors.cat.inversion,
  "Ocio":          colors.cat.ocio,
  "Delivery":      colors.cat.delivery,
  "Transporte":    colors.cat.transporte,
  "Sin categoría": colors.cat.sinCategoria,
};

export const spacing = {
  xs:    4,
  sm:    8,
  md:    16,
  lg:    24,
  xl:    32,
  xxl:   48,
  "3xl": 64,
  "4xl": 80,
};

export const fontSize = {
  xs:  11,
  sm:  14,
  md:  20,
  lg:  28,
  xl:  36,
  xxl: 48,
};

export const fontWeight = {
  light:  "300",
  normal: "400",
  medium: "500",
  bold:   "700",
};

export const radius = {
  none: 0,
  sm:   4,
  md:   8,
  lg:   16,
  full: 9999,
};
