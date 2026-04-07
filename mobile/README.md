# 📱 Saldai — Mobile App

Aplicación móvil desarrollada en **React Native** con **Expo** para la gestión y seguimiento de gastos personales. Diseñada con un enfoque estricto en UI/UX utilizando **NativeWind** (Tailwind CSS) y conectada a una API REST propia.

---

## 🚀 Tecnologías Principales

*   **Framework:** React Native (v0.81) + Expo (SDK 54)
*   **Enrutamiento:** Expo Router (File-based routing)
*   **Estilos:** NativeWind v4 (Tailwind CSS para React Native)
*   **Lenguaje:** TypeScript estricto
*   **Fuentes e Íconos:** `@expo-google-fonts/inter` y `@expo/vector-icons` (Feather)
*   **Estado y Lógica:** Custom Hooks puros de React (`useState`, `useCallback`)
*   **Conexión a Datos:** API REST backend hospedada en Railway

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
├── hooks/                # Lógica de negocio y manejo de estado (useGastos, useGastoMutation)
├── services/             # Capa de red y llamadas a la API (api.ts)
└── tailwind.config.js    # Configuración del motor de estilos y tokens
```

---

## 🎨 Sistema de Diseño (Design Tokens)

Esta aplicación opera bajo un conjunto **muy estricto** de reglas de diseño (ver `CLAUDE.md` o `GEMINI.md` para las directrices completas de agentes de IA).

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
*   [Node.js](https://nodejs.org/) (v18 o superior)
*   [Expo CLI](https://docs.expo.dev/get-started/installation/)
*   App **Expo Go** instalada en tu dispositivo físico iOS/Android, o un emulador configurado.

### Instalación

1.  Clona el repositorio e ingresa a la carpeta del proyecto móvil:
    ```bash
    cd mobile
    ```

2.  Instala las dependencias:
    ```bash
    npm install
    ```

### Ejecución

Levanta el servidor de desarrollo de Expo:

```bash
npx expo start
```

Presiona las siguientes teclas en la terminal para abrir la app:
*   `i` para abrir en el simulador de **iOS**
*   `a` para abrir en el emulador de **Android**
*   Escanea el código QR con la app **Expo Go** para verlo en tu dispositivo físico.

---

## 🤖 Contexto para Agentes de IA

Si eres un agente de inteligencia artificial (Claude, Gemini, Cursor, etc.) operando en este repositorio:
1.  **NO** modifiques la UI sin consultar los tokens estrictos en `CLAUDE.md`.
2.  Mantén la lógica de negocio separada en `hooks/`.
3.  Usa siempre los primitivos de React Native (NUNCA etiquetas HTML).
4.  Cualquier cambio estructural mayor debe registrarse en el `REPORT.md`.
