# CATEGORIES.md — Cómo agregar categorías nuevas

Las categorías están definidas en tres lugares que deben mantenerse sincronizados. Seguir este proceso en orden.

## Los tres lugares

| Archivo | Qué contiene |
|---|---|
| `packages/ui/tokens.js` | Color y emoji de la categoría |
| `api/src/categorizer.js` | Keywords que disparan la categoría |
| `api/src/parser.js` | Orden de prioridad del categorizer |

---

## Proceso paso a paso

### 1. Agregar color y emoji en `packages/ui/tokens.js`

```js
// En colors.cat:
export const colors = {
  cat: {
    // ... categorías existentes ...
    salud: "#5a8a6a",  // ← nuevo
  }
}

// En COLORES_CAT:
export const COLORES_CAT = {
  // ... categorías existentes ...
  "Salud": colors.cat.salud,  // ← nuevo
}

// En EMOJIS_CAT:
export const EMOJIS_CAT = {
  // ... categorías existentes ...
  "Salud": "💊",  // ← nuevo
}
```

### 2. Agregar keywords en `api/src/categorizer.js`

```js
const CATEGORIAS = {
  // ... categorías existentes ...
  Salud: [
    "salud",           // nombre de la categoría (alias directo)
    "farmacia", "remedios", "medicamentos",
    "doctor", "médico", "medico", "consulta",
    "clinica", "clínica", "hospital",
    "dentista", "oculista",
  ],
};
```

Reglas para las keywords:
- Incluir el nombre de la categoría en lowercase como primer keyword (alias directo)
- Incluir variantes con y sin tilde: `"médico"` y `"medico"`
- Incluir nombres de comercios conocidos si aplica
- Incluir palabras relacionadas que el usuario podría escribir naturalmente

### 3. Actualizar el orden de prioridad en `api/src/parser.js`

```js
const ORDEN_PRIORIDAD = [
  "Delivery",      // primero — evita que "uber eats" caiga en Transporte
  "Suscripciones",
  "Básicos",
  "Mercado",
  "Salud",         // ← agregar en la posición correcta
  "Inversión",
  "Ocio",
  "Transporte",    // último — es muy genérico
];
```

El orden importa: si una keyword aparece en dos categorías, gana la que está primero en la lista.

### 4. Verificar con el CLI

```bash
cd api
npm run cli
# Probar casos:
> 5000, farmacia, , hoy, ef
> 12000, dentista, salud, ayer, tc
> 3000, remedios
```

Verificar que:
- La categoría aparece como `[campo]` cuando se escribe explícitamente
- La categoría se infiere correctamente del item cuando el campo está vacío

### 5. Verificar en la app mobile

Abrir `CapturaScreen`, ingresar un gasto con la nueva categoría y verificar que:
- El emoji aparece en `CategorySelector`
- El color es correcto en `DashboardScreen`

---

## Checklist

```
[ ] Color agregado en colors.cat en tokens.js
[ ] Color agregado en COLORES_CAT en tokens.js
[ ] Emoji agregado en EMOJIS_CAT en tokens.js
[ ] Keywords agregadas en categorizer.js
[ ] Categoría agregada en ORDEN_PRIORIDAD en parser.js
[ ] Testeado con CLI
[ ] Verificado visualmente en la app
[ ] Git commit con mensaje: "feat: add categoria [nombre]"
```
