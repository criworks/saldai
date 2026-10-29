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

```text
mobile/
├── app/                  # Rutas de Expo Router (Pantallas UI)
│   ├── (tabs)/           # Navegación inferior (Captura e Index)
│   └── _layout.tsx       # Layout principal y carga de fuentes globales
├── components/           # Componentes visuales puros
│   └── ui/               # Componentes base (ej. GradientFooter)
├── constants/            # Tokens de diseño y variables globales (theme.ts)
├── contexts/             # Estado compartido (AuthContext, GastosContext, FilterContext)
├── hooks/                # Lógica de negocio y manejo de estado (useGastos, useGastoMutation)
├── lib/                  # Íconos (phosphor), helpers de tema y `cn`
├── services/             # Capa de red, Supabase y mocks (api.ts, supabase.ts, mockConfig.ts)
└── tailwind.config.js    # Configuración del motor de estilos y tokens
```

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

Hay que volver a buildear solo cuando cambian las dependencias nativas o la
configuración de `app.json`; los cambios de JavaScript y de estilos entran por
el dev server como antes.

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
2.  Mantén la lógica de negocio separada en `hooks/`.
3.  Usa siempre los primitivos de React Native (NUNCA etiquetas HTML).
4.  Cualquier cambio estructural mayor debe registrarse en el `REPORT.md`.
