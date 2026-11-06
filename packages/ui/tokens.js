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
  // Rojo fuerte, solo para acciones destructivas de verdad (borrar la cuenta).
  errorStrong: "#FF4343",
  // Fondo de la variante destructiva de los componentes.
  destructive: "#7F1D1D",
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

/**
 * Medidas con nombre de uso. `control` es la altura que comparten los campos
 * de texto, el campo del código de 6 dígitos y los botones grandes: estaba
 * escrita como `h-[56px]` en cinco archivos, que es justo la clase de valor
 * suelto que se desincroniza cuando alguien ajusta uno solo.
 */
export const sizes = {
  control: 56,
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
  // La cifra grande de la pantalla de captura.
  display: 40,
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

/**
 * Capa semántica: el nombre que usa la UI ("card", "muted-foreground") y el
 * color del catálogo que le toca. De acá salen las dos cosas que antes se
 * mantenían a mano y por separado: las clases de NativeWind
 * (`mobile/tailwind.config.js`) y las variables CSS de `mobile/global.css`,
 * que se generan con `npm run tokens:css`.
 */
export const semantic = {
  background: colors.bg,
  foreground: colors.text,

  card: colors.bgElevated,
  "card-foreground": colors.text,

  popover: colors.bgElevated,
  "popover-foreground": colors.text,

  primary: colors.text,
  "primary-foreground": colors.bg,

  secondary: colors.bgElevated,
  "secondary-foreground": colors.text,

  muted: colors.bgElevated,
  "muted-foreground": colors.textMuted,

  accent: colors.bgElevated,
  "accent-foreground": colors.text,

  destructive: colors.destructive,
  "destructive-foreground": colors.text,

  warning: colors.warning,
  "warning-foreground": colors.text,
  "warning-border": colors.warningBorder,

  border: colors.bgElevated,
  "border-active": colors.borderActive,
  input: colors.bgElevated,
  ring: colors.textMuted,
};

/**
 * El mismo color del catálogo pero translúcido, para degradados y overlays.
 * Existe para no tener que escribir el `rgba(17,18,23,0)` a mano en una
 * pantalla, que es justo la clase de valor suelto que se desincroniza.
 */
export const withAlpha = (hex, alpha) => {
  const [r, g, b] = hexARgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

/** `#112233` -> `[17, 34, 51]`. Acepta también la forma corta `#123`. */
export const hexARgb = (hex) => {
  const limpio = hex.replace("#", "");
  const completo =
    limpio.length === 3
      ? limpio.split("").map((c) => c + c).join("")
      : limpio;
  return [0, 2, 4].map((i) => parseInt(completo.slice(i, i + 2), 16));
};

/**
 * `#112233` -> `"210 50% 13%"`, el formato que espera `hsl(var(--x))`.
 * Lo usa el generador de `mobile/global.css`.
 */
export const hexAHsl = (hex) => {
  const [r, g, b] = hexARgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return `0 0% ${redondear(l * 100)}%`;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) * 60
      : max === g
        ? ((b - r) / d + 2) * 60
        : ((r - g) / d + 4) * 60;
  return `${redondear(h)} ${redondear(s * 100)}% ${redondear(l * 100)}%`;
};

// Un decimal, y sin el `.0` cuando es redondo.
const redondear = (n) => String(Math.round(n * 10) / 10);
