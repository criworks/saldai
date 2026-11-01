# 📱 Saldai — Mobile App

Aplicación móvil desarrollada en **React Native** con **Expo** para la gestión y seguimiento de gastos personales. Diseñada con un enfoque estricto en UI/UX utilizando **NativeWind** (Tailwind CSS) y conectada a una API REST propia.

---

## 🚀 Tecnologías Principales

*   **Framework:** React Native (v0.81) + Expo (SDK 54)
*   **Enrutamiento:** Expo Router (File-based routing)
*   **Estilos:** NativeWind v4 (Tailwind CSS para React Native)
*   **Lenguaje:** TypeScript estricto
*   **Fuentes e Íconos:** `@expo-google-fonts/inter` y `phosphor-react-native` (re-exportados desde `lib/icons.ts`)
*   **Estado y Lógica:** Custom Hooks puros de React (`useState`, `useCallback`)
*   **Conexión a Datos:** API REST backend hospedada en Render, autenticación con Supabase

---

## 📁 Estructura del Proyecto

El proyecto sigue una arquitectura limpia de separación de responsabilidades:

El código se agrupa **por feature**, no por tipo de archivo: el estado, los
componentes y las llamadas de una misma parte del producto viven juntos.

```text
mobile/
├── app/                  # Rutas de Expo Router: solo pantallas y layouts
│   ├── (auth)/           # Login
│   ├── (tabs)/           # Navegación inferior
│   └── _layout.tsx       # Layout raíz, fuentes y providers
├── features/
│   ├── gastos/           # El dominio de la app
│   │   ├── index.ts      # Lo único que importan las pantallas
│   │   ├── api.ts        # Las tres llamadas de gastos
│   │   ├── GastosContext.tsx, FilterContext.tsx, useGastoMutation.ts
│   │   ├── componentes/  # Componentes que solo tienen sentido con gastos
│   │   └── __tests__/
│   └── auth/             # Sesión: contexto y los pasos de verificación
│       ├── index.ts
│       ├── AuthContext.tsx
│       └── componentes/
├── components/ui/        # Primitivos sin dominio (Button, Input, Alert, Text…)
├── constants/            # Reexport de tokens y constantes de pantalla (theme.ts)
├── lib/                  # Cliente de react-query, íconos, helpers de tema y `cn`
├── services/             # Infraestructura compartida: Supabase y mocks
└── tailwind.config.js    # Configuración del motor de estilos y tokens
```

Cada feature expone su superficie en un `index.ts`. Las pantallas importan
`@/features/gastos`, nunca un archivo de adentro: así reacomodar la feature no
toca las rutas. Dentro de una feature los vecinos se importan relativo (`./api`),
porque importar el propio barril sería circular.

### El alias `@/`

`@/` apunta a la raíz de `mobile/`. Está declarado en tres lugares y los tres
hacen falta: `tsconfig.json` (para el editor y `tsc`), Metro lo lee de ahí solo
para el bundle, y `jest.config.js` lo repite en `moduleNameMapper` porque Jest no
lee `tsconfig.json`.

---

## 🎨 Sistema de Diseño (Design Tokens)

Esta aplicación opera bajo un conjunto **muy estricto** de reglas de diseño. Los tokens viven en `packages/ui/tokens.js` y mobile los re-exporta desde `constants/theme.ts`.

*   **Paleta de Colores:**
    *   Fondo: `#111217`
    *   Interactivo/Bordes: `#262A35`
    *   Texto Secundario: `#60677D`
    *   Texto Principal: `#ffffff`
*   **Tipografía:** Inter (Tamaños estrictos: 12, 14, 16, 18, 24, 40px)
*   **Espaciados:** Solo múltiplos base (8, 12, 16, 24px)

---

## 💻 Desarrollo Local

### Requisitos Previos
*   [Node.js](https://nodejs.org/) 22 (la versión fijada del monorepo, ver `.node-version`)
*   Un *development build* instalado en el dispositivo (ver más abajo). Expo Go
    no sirve: queda atado a su versión de SDK y deja de abrir el proyecto.
*   `mobile/.env` con las variables de `mobile/.env.example`.

### Instalación

1.  Clona el repositorio e ingresa a la carpeta del proyecto móvil:
    ```bash
    cd mobile
    ```

2.  Instala las dependencias **desde la raíz** del repo, que es donde viven los
    workspaces:
    ```bash
    cd .. && npm install
    ```

### Ejecución

Levanta el servidor de desarrollo de Expo:

```bash
npx expo start --dev-client
```

Presiona las siguientes teclas en la terminal para abrir la app:
*   `i` para abrir en el simulador de **iOS**
*   `a` para abrir en el emulador de **Android**
*   Escanea el código QR para abrirlo en el development build de tu dispositivo físico.

### Probar en un dispositivo físico: development build

Expo Go está atado a la versión de SDK que trae instalada, así que cuando se
actualiza deja de abrir el proyecto ("Project is incompatible with this version
of Expo Go"). Un *development build* evita eso: es la app del proyecto
instalada en el dispositivo, con el cliente de desarrollo adentro, así que
carga el bundle del `expo start` de siempre sin depender de Expo Go.

Los perfiles están en `mobile/eas.json`. Una sola vez por dispositivo:

```bash
cd mobile
npx eas-cli@latest login            # con la cuenta dueña del proyecto EAS
npm run build:dev:android           # o build:dev:ios
```

EAS buildea en la nube y devuelve un link para instalar el APK (o el build de
iOS). Después de instalarlo, el ciclo de trabajo es el de siempre:

```bash
npm start      # y se abre la app instalada, no Expo Go
```

Hay que volver a buildear solo cuando cambia el código nativo; los cambios de
JavaScript y de estilos entran por el dev server. La lista exacta está en la
sección siguiente.

### Cuándo hay que rebuildear y cuándo no

Instalar la app y cargar el código son pasos separados, y el que tarda es solo
el primero. El development build no lleva el código adentro: cuando lo abres
busca el servidor de Metro de tu máquina y baja el bundle de ahí. Mientras el
binario tenga los mismos módulos nativos, cambiar código no lo toca.

**Sí hay que rebuildear** cuando:

*   Agregas, sacas o subes de versión una dependencia con código nativo. Las que
    tiene hoy el proyecto: `react-native-keyboard-controller`,
    `react-native-reanimated`, `react-native-screens`, `react-native-svg`,
    `expo-secure-store`, `expo-font`, `expo-linear-gradient` y
    `@react-native-community/datetimepicker`.
*   Cambia `app.json` en lo que toca el binario: `plugins`, `package` /
    `bundleIdentifier`, `scheme`, iconos y splash, `edgeToEdgeEnabled`,
    `newArchEnabled`, permisos.
*   Subes la versión del SDK de Expo o de React Native.

**No hay que rebuildear** cuando cambia:

*   Cualquier `.ts` / `.tsx` de `app/`, `features/`, `components/`, `lib/` o
    `services/`.
*   `tailwind.config.js`, `global.css`, los tokens de `packages/ui` o cualquier
    cosa de `packages/core`.
*   `mobile/.env` — eso sí pide reiniciar el dev server, porque las variables
    `EXPO_PUBLIC_*` se leen al arrancar.
*   Un asset que ya estaba referenciado.

Si un cambio de estilos no aparece, antes de sospechar del binario:
`npm run start:clear`, que limpia la caché de Metro.

### Buildear en tu máquina en vez de la nube

EAS buildea en una máquina efímera, así que no guarda la caché de Gradle entre
builds y todos tardan parejo (del orden de 10 a 25 minutos, más la cola).
Compilando en tu máquina el primer build tarda parecido, porque baja Gradle y
el NDK, pero los siguientes reusan casi todo:

```bash
npm run run:android     # o run:ios
```

Requisitos, una sola vez: para Android, JDK 17 y el SDK de Android (lo más
simple es instalar Android Studio y desde su SDK Manager agregar la plataforma
y los Build-Tools), con `ANDROID_HOME` apuntando a `~/Library/Android/sdk`.
Para iOS, Xcode.

El proyecto no versiona las carpetas nativas (`/ios` y `/android` están en el
`.gitignore`), así que `run:android` corre `expo prebuild` y las genera la
primera vez. Eso es esperado y no se commitea.

`eas build --local` existe también, pero pide los mismos requisitos y sirve
para otra cosa: sacar un artefacto idéntico al de la nube sin gastar cola.

### El emulador de Android y el simulador de iOS

Corren enteros en tu computador, sin teléfono. Con el dev server arriba, `a`
abre el emulador de Android y `i` el simulador de iOS.

Para que `a` funcione, el emulador necesita el development build instalado, y
el APK de EAS está compilado para los ABI del teléfono. Lo más simple es abrir
el emulador y correr `npm run run:android`, que compila e instala con el ABI
correcto. Para el simulador de iOS hace falta un build hecho para simulador:
ese es el perfil `development-simulator` de `eas.json`, o sea
`npm run build:dev:ios:sim`, porque el perfil `development` declara
`ios.simulator: false`.

Dos limitaciones que conviene tener claras:

*   **El teclado.** Por defecto el emulador de Android usa el teclado físico de
    tu máquina, así que el teclado en pantalla no aparece. Se enciende
    desmarcando "Enable keyboard input" en los ajustes del AVD. Aun así es el
    teclado de AOSP: su altura, su barra de sugerencias y su animación no son
    las de Gboard ni las del teclado de Samsung.
*   **El edge-to-edge de Android 16.** Depende de la versión de Android y de
    cómo el fabricante dibuja las barras del sistema. Un AVD con la imagen de
    API 36 se acerca, pero la altura real de la barra de navegación, el modo de
    gestos y el notch son del dispositivo.

O sea: el emulador sirve muy bien para layout, espaciados, navegación y estados
de pantalla. Un fix de teclado o de safe areas se firma en un dispositivo real.

### Tener la app funcionando sin el computador: build de `preview`

El development build **no trae el código adentro**: lo carga del `expo start`
de tu máquina, así que con el computador apagado no abre. Para una app que
funcione sola, el perfil `preview` empaqueta el JavaScript dentro del APK:

```bash
cd mobile
npm run build:preview:android
```

Sigue siendo `distribution: internal`, o sea EAS devuelve un link de descarga y
no pasa por la Play Store. Se instala una vez y queda. Para publicar de verdad
está el perfil `production`, que genera un `.aab` en vez de un APK.

**Antes del primer build de `preview` hay que crear las variables en EAS.** El
bundle se arma en la nube de Expo, que no ve tu `.env`, así que
`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL` y
`EXPO_PUBLIC_SUPABASE_ANON_KEY` tienen que existir en el dashboard de Expo, en
Environment variables, en el environment `preview`. Si faltan, el APK sale con
las tres en `undefined` y la app abre pero no autentica ni lee gastos. Cada
perfil de `eas.json` declara con `environment` cuál de esos sets usa.

La rama en la que estás parado decide qué código queda empaquetado. Para un APK
con lo que hay en producción, hay que buildear desde `main`. A qué API le pega
la app no depende de la rama, depende de `EXPO_PUBLIC_API_URL`.

---

## 🤖 Contexto para Agentes de IA

Si eres un agente de inteligencia artificial (Claude, Gemini, Cursor, etc.) operando en este repositorio:
1.  **NO** modifiques la UI sin consultar los tokens estrictos en `CLAUDE.md`.
2.  La lógica de una parte del producto va en su `features/<nombre>/`, y se expone por el `index.ts` de esa feature.
3.  Usa siempre los primitivos de React Native (NUNCA etiquetas HTML).
4.  Cualquier cambio estructural mayor debe registrarse en el `REPORT.md`.
