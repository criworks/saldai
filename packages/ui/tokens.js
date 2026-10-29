/**
 * Design Tokens — Saldai
 *
 * Fuente única de verdad para colores, tipografía, spacing y constantes de UI.
 * Usado por web/ (Tailwind CSS), mobile/ (NativeWind) y cualquier paquete futuro.
 *
 * Las categorías no se listan acá: el catálogo vive en @saldai/core y este
 * paquete solo le pone color y emoji a cada una. Así una categoría nueva no
 * puede quedar a medias, con keywords en la API pero sin nada que mostrar.
 */

import { NOMBRES_CATEGORIAS, SIN_CATEGORIA } from "@saldai/core/categorias";

export const colors = {
  // Fondos
  bg:           "#111217",
  bgElevated:   "#262A35",
  bgSubtle:     "#1a1a1a",

  // Bordes
  border:       "#1a1a1a",
  borderMuted:  "#222222",
  borderActive: "#353A47",

  // Texto
  text:         "#ffffff",
  textMuted:    "#60677D",
  textDisabled: "#2a2a2a",

  // Estados
  success:  "#4a7c59",
  error:    "#a65b5b",
  warning:  "#E98B00",
  warningBorder: "#5B3600",

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

// Color y emoji de cada categoría del catálogo de @saldai/core.
const presentacionPorCategoria = {
  "Básicos":       { color: colors.cat.basicos,       emoji: "🏠"  },
  "Suscripciones": { color: colors.cat.suscripciones, emoji: "💳"  },
  "Mercado":       { color: colors.cat.mercado,       emoji: "🛒"  },
  "Inversión":     { color: colors.cat.inversion,     emoji: "🌱"  },
  "Ocio":          { color: colors.cat.ocio,          emoji: "☕️" },
  "Delivery":      { color: colors.cat.delivery,      emoji: "💣"  },
  "Transporte":    { color: colors.cat.transporte,    emoji: "🚌"  },
};

const sinCategoria = { color: colors.cat.sinCategoria, emoji: "💸" };

const presentacion = (categoria) =>
  presentacionPorCategoria[categoria] ?? sinCategoria;

// Lookup dinámico de color por nombre de categoría
export const categoryColor = (categoria) => presentacion(categoria).color;

// Emoji por categoría
export const categoryEmoji = (categoria) => presentacion(categoria).emoji;

// Los dos mapas se arman desde el catálogo, no a mano, así que siempre tienen
// exactamente las categorías que existen.
const porCategoria = (valor) =>
  [...NOMBRES_CATEGORIAS, SIN_CATEGORIA].reduce(
    (acc, categoria) => ({ ...acc, [categoria]: valor(categoria) }),
    {}
  );

// Emojis por categoría
export const EMOJIS_CAT = porCategoria(categoryEmoji);

// Colores por categoría (Record compatible con TS)
export const COLORES_CAT = porCategoria(categoryColor);

export const spacing = {
  xs:    4,
  sm:    8,
  md:    12,
  lg:    16,
  xl:    24,
  xxl:   32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 64,
  "6xl": 80,
};

export const fontSize = {
  xs:   11,
  sm:   12,
  base: 14,
  md:   16,
  lg:   18,
  xl:   20,
  xxl:  24,
  "3xl": 28,
  "4xl": 36,
  "5xl": 48,
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
