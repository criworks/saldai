const { hairlineWidth } = require("nativewind/theme");
const tokens = require("../packages/ui/tokens.js");

// Spacing y tipografía salen de los tokens con la unidad puesta:
// { xs: '4px', … } y { base: '14px', … }.
const conPx = (escala) =>
  Object.fromEntries(Object.entries(escala).map(([k, v]) => [k, `${v}px`]));

const spacingPx = conPx(tokens.spacing);
const fontSizePx = conPx(tokens.fontSize);
const radiusPx = conPx(tokens.radius);

/**
 * Los colores son los nombres de la capa semántica de los tokens, resueltos vía
 * las variables CSS que genera `npm run tokens:css`. La lista no se escribe a
 * mano: un nombre nuevo en los tokens aparece acá solo.
 *
 * Un nombre compuesto se anida cuando su prefijo también es un color, así
 * `card-foreground` queda como `card.foreground` y la clase sigue siendo
 * `text-card-foreground`.
 */
const colors = Object.keys(tokens.semantic).reduce((acc, nombre) => {
  const valor = `hsl(var(--${nombre}))`;
  const corte = nombre.indexOf("-");
  const base = corte === -1 ? null : nombre.slice(0, corte);
  if (base && base in tokens.semantic) {
    const sufijo = nombre.slice(corte + 1);
    acc[base] = { ...acc[base], [sufijo]: valor };
    return acc;
  }
  acc[nombre] = { ...acc[nombre], DEFAULT: valor };
  return acc;
}, {});

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  // Tailwind solo genera las clases que encuentra escritas en estos archivos.
  // Una carpeta que no esté acá no da error: sus clases simplemente no existen
  // y el componente se ve sin estilos. Si aparece una carpeta nueva con
  // `className`, va acá — y `npm run tailwind:content:check` lo verifica.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter_400Regular', 'sans-serif'],
        light: ['Inter_300Light', 'sans-serif'],
        normal: ['Inter_400Regular', 'sans-serif'],
        medium: ['Inter_500Medium', 'sans-serif'],
        bold: ['Inter_700Bold', 'sans-serif'],
      },
      spacing: spacingPx,
      // Nombres por uso, no por tamaño: la pantalla dice `text-body`, no 14px.
      fontSize: {
        'detail': fontSizePx.sm,       // 12px
        'body': fontSizePx.base,       // 14px
        'menu': fontSizePx.md,         // 16px
        'subtitle': fontSizePx.lg,     // 18px
        'title': fontSizePx.xxl,       // 24px
        'hero': fontSizePx['3xl'],     // 28px
        'display': fontSizePx.display, // 40px, la cifra de la captura
      },
      colors,
      borderWidth: {
        hairline: hairlineWidth(),
      },
      // Los radios de los tokens: rounded-md = 8px, rounded-lg = 16px.
      // `extend` deja en pie el resto de la escala de Tailwind.
      borderRadius: radiusPx,
    },
  },
  plugins: [],
};
