const { hairlineWidth } = require("nativewind/theme");
const tokens = require("../packages/ui/tokens.js");

// Estandarizar Spacing: { xs: '4px', ... }
const spacingPx = Object.fromEntries(
  Object.entries(tokens.spacing).map(([k, v]) => [k, `${v}px`])
);

// Estandarizar Tipografía: { xs: '11px', ... }
const fontSizePx = Object.fromEntries(
  Object.entries(tokens.fontSize).map(([k, v]) => [k, `${v}px`])
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
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
      fontSize: {
        'detail': fontSizePx.sm,     // 12px
        'body': fontSizePx.base,     // 14px
        'menu': fontSizePx.md,       // 16px
        'subtitle': fontSizePx.lg,   // 18px
        'title': fontSizePx.xxl,     // 24px
        'hero': fontSizePx['3xl'],   // 28px
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      radius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};