# CLAUDE.md — Saldai mobile (Expo / React Native)

Guía para trabajar en `mobile/`. La app funciona y está conectada a la API y a
Supabase: acá se edita, se extiende o se refactoriza sin romper lo que ya
funciona. Lo transversal del monorepo está en el `CLAUDE.md` de la raíz.

Si algo de este archivo quedó desactualizado respecto del código, corregirlo es
parte del cambio.

**Antes de editar:** leer el archivo completo, ver qué contextos, consultas y
servicios usa, y preservar los nombres de export que otros archivos importan.

---

## Stack

| Qué | Con qué |
|-----|---------|
| Framework | Expo 54, React Native 0.81, React 19.1, TypeScript `strict` |
| Navegación | Expo Router 6 (rutas por archivo en `app/`) |
| Estilos | NativeWind 4 sobre Tailwind 3 — `className` con clases Tailwind |
| Íconos | **`phosphor-react-native`**, re-exportados desde `lib/icons.ts` |
| Datos | `@tanstack/react-query` (`lib/consultas.ts`) |
| Primitivos | `@rn-primitives/*` (portal, progress, separator, slot) |
| Variantes | `class-variance-authority` + `tailwind-merge` (`cn` en `lib/utils.ts`) |
| Teclado | `react-native-keyboard-controller` + Reanimated 4 |
| Gradientes | `expo-linear-gradient` |
| Áreas seguras | `react-native-safe-area-context` |
| Sesión | Supabase (`@supabase/supabase-js`) con `expo-secure-store` |
| Fuente | Inter (`@expo-google-fonts/inter`) |
| Tests | Jest + `jest-expo` + `@testing-library/react-native` |

Los íconos **no** son `@expo/vector-icons`. Para usar uno nuevo hay que
agregarlo a `lib/icons.ts`, que les aplica `cssInterop` para que acepten
`className`.

Los imports son absolutos con el alias `@/` (`@/features/gastos`). El alias
está en `tsconfig.json` y repetido en el `moduleNameMapper` de
`jest.config.js`, porque Jest no lee `tsconfig.json`.

---

## Estructura

Agrupada por feature, no por tipo de archivo.

```
app/                        # Rutas (Expo Router)
  _layout.tsx               # Fuentes, AuthProvider, QueryClientProvider, PortalHost
  (auth)/login.tsx          # Login por OTP de 6 dígitos al email
  (tabs)/index.tsx          # Feed del mes
  (tabs)/captura.tsx        # Captura de gasto
  (tabs)/meses.tsx
  (tabs)/mes-contable.tsx
  (tabs)/categorias.tsx
  (tabs)/configuraciones.tsx
  (tabs)/cuenta.tsx
  playground.tsx            # Pruebas de UI (solo en dev con mocks)
features/gastos/            # Estado, componentes y llamadas de gastos
features/auth/              # Lo mismo para la sesión
components/ui/              # Solo primitivos sin dominio
lib/                        # icons, consultas (react-query), funciones (flags), theme, utils
services/supabase.ts
services/mocks/             # Reemplazo de Supabase y de la API en modo mock
constants/theme.ts          # Campos de la captura; re-export de core y de tokens
scripts/                    # Generador y verificador de global.css y de Tailwind
```

Cada feature expone su superficie en un `index.ts` y las pantallas importan solo
eso: así reacomodar una feature por dentro no toca las rutas. No importar desde
los archivos internos de una feature.

En `components/ui/` van solo los primitivos sin dominio (`Alert`, `Input`,
`BotonLimpiar`, `MenuItem`, `button`, `text`…). Un componente que lee un
contexto de gastos pertenece a `features/gastos/componentes/`.

Los tests viven en `__tests__/` al lado de lo que prueban.

---

## Datos

Todo pasa por react-query. `lib/consultas.ts` tiene el cliente y, en `llaves`,
las llaves de caché — una llave escrita a mano en dos pantallas es una caché
que no se invalida, así que las llaves nuevas van ahí.

Los defaults que vale conocer: `staleTime` 60s (un mes ya cargado se muestra al
toque y se revalida en segundo plano), `gcTime` 30min, dos reintentos para las
queries y **cero para las mutaciones** (reintentar a ciegas un `POST /gastos`
puede duplicar el gasto). `refetchOnWindowFocus` está en `false` porque React
Native no tiene foco de ventana: el refetch al volver a una pantalla lo maneja
cada pantalla con `useFocusEffect`.

Las llamadas están en `features/gastos/api.ts`. Van con
`Authorization: Bearer <access_token>` de la sesión de Supabase; sin eso la API
responde 401. El mensaje de error se saca con el helper `mensajeDeError`, que
lee `errores` (plural) y cae a `error` solo para los 401 — si se agrega una
llamada, usar ese helper y no leer el cuerpo a mano.

Los tipos de las respuestas vienen de `@saldai/core`
(`GastosDelMes`, `TotalesAnuales`, `GastoCreado`). No redeclararlos acá.

---

## Variables de entorno

En `mobile/.env`, con prefijo `EXPO_PUBLIC_` (ver `.env.example`):

- `EXPO_PUBLIC_API_URL` — base de la API.
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- `EXPO_PUBLIC_USE_MOCKS` — `'true'` reemplaza Supabase y la API por
  `services/mocks/` y habilita el playground. Solo para desarrollo y QA.

Quedan **horneadas en el bundle** y Metro las cachea: después de cambiar una hay
que correr `npm run start:clear`, no alcanza con guardar. Para un build de EAS
no se leen de acá: hay que tenerlas en el environment correspondiente del
dashboard de Expo, porque el bundle se arma en la nube.

---

## Variantes de la app

`app.config.js` lee `app.json` y cambia la identidad según `APP_VARIANT`, que
declaran los perfiles de `eas.json` y los scripts de `package.json`:

| `APP_VARIANT` | package / bundle id | Nombre | Scheme |
|---|---|---|---|
| `development` | `com.crirun.saldai.dev` | Saldai (Dev) | `saldai-dev` |
| sin valor (preview y producción) | `com.crirun.saldai` | Saldai | `saldai` |

Así el development build convive en el teléfono con el APK de `preview`, que es
el que funciona sin el dev server. El dev client **no trae el JS adentro**: lo
baja del Metro local, así que cualquier cambio de JS, TS, estilos o tokens se ve
al guardar. Solo hace falta un build nuevo si cambia código o dependencias
nativas.

---

## Flags de producto

`lib/funciones.ts` declara qué partes del producto se muestran. Son constantes y
no variables de entorno a propósito: lo que entra en una versión es una decisión
que queda en el código y en su historia, no algo que cambia según el build.

Hoy `CATEGORIAS_VISIBLES` y `METODOS_VISIBLES` están en `false`. Por dentro
todo sigue funcionando y la API sigue guardando la categoría; lo que está
apagado es solo lo que ve el usuario. No prenderlas de paso.

---

## Reglas

### Nunca
- Tags HTML: `<div>`, `<span>`, `<a>`, `<button>`, `<p>`.
- Librerías de UI de terceros (NativeBase, Tamagui, NativeWindUI Pro).
- Instalar dependencias sin pedirlo. Una con código nativo obliga a un build
  nuevo, así que no entra sin avisar.
- Tocar `app.json`, `app.config.js`, `eas.json`, `babel.config.js`,
  `metro.config.js`, `tailwind.config.js`, `jest.config.js` o `package.json`
  sin que se pida.
- Editar `global.css` a mano: es generado, y CI lo verifica.
- Romper rutas existentes de Expo Router.
- Dejar errores de `tsc`.

### Siempre
- Primitivos de RN: `<View>`, `<Text>`, `<ScrollView>`, `<Pressable>`,
  `<FlatList>`, `<TextInput>`.
- `<Pressable>` en vez de `<TouchableOpacity>`.
- `SafeAreaView` de `react-native-safe-area-context`.
- `<FlatList>` para listas largas, no `<ScrollView>` con `map`.
- Clases con nombre semántico, no valores sueltos.

---

## Estilos y tokens

La fuente de verdad es `packages/ui/tokens.js`; `constants/theme.ts` re-exporta
lo que las pantallas necesitan. De los tokens salen, generadas, las clases de
`tailwind.config.js` y las variables de `global.css`.

Eso significa que **se usa el nombre, no el hex**: `bg-background`,
`text-foreground`, `text-muted-foreground`, `bg-card`, `border-border-active`,
`h-control`. Un `bg-[#111217]` escrito a mano es el mismo color pero fuera del
sistema, y es lo que se desincroniza cuando el token cambia. Tipografía,
spacing y radios igual: la escala está en los tokens.

Para cambiar un color: cambiarlo en `packages/ui/tokens.js`, correr
`npm run tokens:css` desde la raíz y commitear `mobile/global.css`.

Cada categoría tiene su color y su emoji en los tokens (`COLORES_CAT`,
`EMOJIS_CAT`, `categoryColor`, `categoryEmoji`). Para un color translúcido,
`withAlpha`, no un `rgba(...)` a mano.

Un fix visual que aplica a más de una pantalla va al componente compartido o al
token; uno que aplica a una sola se arregla ahí, pero consumiendo un token que
ya existe.

---

## Comandos

```
npm start            # dev client contra el Metro local (APP_VARIANT=development)
npm run start:clear  # igual, limpiando la caché de Metro — tras cambiar el .env
npm run android
npm run ios
npm run typecheck    # tsc --noEmit
npm test             # jest

npm run build:dev:android
npm run build:dev:ios
npm run build:preview:android   # APK con las env vars horneadas, sin dev server
```

El emulador de Android sirve para layout, pero su teclado es el de AOSP: el
teclado y las safe areas (edge-to-edge es obligatorio en SDK 54) se firman en un
teléfono de verdad.

---

## Flujo de trabajo

1. Leer completo el archivo a modificar.
2. Identificar los contextos, las consultas y los servicios que usa.
3. Editar preservando props, callbacks y nombres de export.
4. `npm run typecheck` y `npm test`.
5. Si cambiaron los tokens, `npm run tokens:css` desde la raíz.
6. Si cambió el stack, las rutas, los flags o los tokens, actualizar este
   archivo.
