# TOKENS.md — Design Tokens

## Ubicación

```
packages/ui/tokens.js
```

Importar siempre desde `@expenses/ui/tokens`. Nunca definir colores, emojis o constantes de diseño en archivos de componentes o pantallas.

## Cómo importar

```ts
// En mobile/ (TypeScript)
import { colors, COLORES_CAT, EMOJIS_CAT, categoryColor } from '@expenses/ui/tokens'

// En web/ (JavaScript)
import { colors, categoryColor } from '@expenses/ui/tokens'

// Re-export desde constants/theme.ts (mobile)
export { COLORES_CAT, EMOJIS_CAT, categoryColor } from '@expenses/ui/tokens'
```

## Tokens disponibles

### `colors`

```js
colors.bg           // "#111217" — fondo principal
colors.bgElevated   // "#262A35" — fondo de cards, pills, selectores
colors.bgSubtle     // "#1a1a1a" — fondo sutil
colors.border       // "#1a1a1a" — bordes
colors.borderActive // "#555555" — borde en foco
colors.text         // "#ffffff" — texto principal
colors.textMuted    // "#60677D" — texto secundario, placeholders
colors.textDisabled // "#2a2a2a" — texto deshabilitado
colors.success      // "#4a7c59" — feedback positivo
colors.error        // "#a65b5b" — feedback de error
colors.warning      // "#8a6d3b" — advertencia
colors.cat.*        // colores por categoría (ver abajo)
```

### `COLORES_CAT`

Record de categoría → color hexadecimal. Usar para lookup dinámico en listas y charts.

```ts
COLORES_CAT["Básicos"]       // "#4a7c59"
COLORES_CAT["Suscripciones"] // "#5b6fa6"
COLORES_CAT["Mercado"]       // "#8a6d3b"
COLORES_CAT["Inversión"]     // "#6b5b95"
COLORES_CAT["Ocio"]          // "#a65b5b"
COLORES_CAT["Delivery"]      // "#a67c52"
COLORES_CAT["Transporte"]    // "#4a7a8a"
COLORES_CAT["Sin categoría"] // "#444444"
```

### `EMOJIS_CAT`

Record de categoría → emoji. Usar en `CategorySelector` y cualquier UI que muestre categorías.

```ts
EMOJIS_CAT["Básicos"]       // "🏠"
EMOJIS_CAT["Mercado"]       // "🛒"
EMOJIS_CAT["Suscripciones"] // "💳"
EMOJIS_CAT["Transporte"]    // "🚌"
EMOJIS_CAT["Ocio"]          // "☕️"
EMOJIS_CAT["Delivery"]      // "💣"
EMOJIS_CAT["Inversión"]     // "🌱"
EMOJIS_CAT["Sin categoría"] // "💸"
```

### `categoryColor(categoria)`

Función de lookup. Devuelve el color de una categoría o `#444444` si no existe.

```ts
categoryColor("Ocio")        // "#a65b5b"
categoryColor("Inexistente") // "#444444"
```

### `spacing`, `fontSize`, `fontWeight`, `radius`

Escalas de diseño. Usar como referencia para valores arbitrarios en NativeWind/Tailwind.

```js
spacing.md  // 16
fontSize.xl // 36
fontWeight.light // "300"
radius.full // 9999
```

## Cómo extender los tokens

Ver `CATEGORIES.md` para agregar categorías nuevas (implica actualizar tokens).

Para agregar otros tokens (nuevos colores, tamaños, etc.):

1. Editar `packages/ui/tokens.js`
2. Si es TypeScript, actualizar los tipos en `packages/ui/tokens.d.ts` si existe
3. Verificar que los consumidores (`mobile/`, `web/`) no necesiten ajustes

## Reglas

- **No hardcodear colores** en componentes. Siempre usar tokens o clases de Tailwind que referencien los mismos valores.
- **No duplicar** `COLORES_CAT` o `EMOJIS_CAT` en `constants/theme.ts` — solo re-exportar.
- **`theme.ts` es un relay**, no una fuente de verdad.
