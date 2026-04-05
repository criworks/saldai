# CHANGELOG

## [1.5.2] - 2026-04-03
### Changed
- **Login Flow Refactor**: Unificamos completamente la experiencia visual de inicio de sesión (`login.tsx` y `verify.tsx`) para que sea estructural y lógicamente idéntica a la sección de cambiar email en cuenta (`cuenta.tsx`).
  - Ambas interfaces ahora comparten envolturas base (`SafeAreaView`, `KeyboardAvoidingView`, `ScrollView`).
  - Se suprimió la dependencia en `TextInput` nativo crudo para visualización del token; en cambio, se importó el renderizado visual de puntos PIN con cursor parpadeante (`renderOtpDots()`).
  - Manejo integral unificado de estado dinámico de bordes basado en tokens Tailwind (focus gray, error red).
- **Auto-submit OTP Verification**: Añadida lógica `useEffect` a `verify.tsx` para efectuar automáticamente la llamada a Supabase Auth tan pronto el usuario introduce el sexto y último dígito.
- **Manejo de Errores Global**: Ambas pantallas de autenticación descartaron los antiguos bloques de texto en línea para errores y ahora despachan notificaciones contextuales a través del componente `<Alert />` flotante y el pill de éxito `<Notification />`.
- **Protección de Rate Limit**: El botón secundario "Reenviar código" en `verify.tsx` ahora invoca la lógica de protección de Supabase, activando visualmente la cuenta regresiva temporal (`cooldownSeconds`) si se golpea el límite de API.
- **Login UI**: El campo de texto en login ya no tiene texto descriptivo flotante y solo muestra el botón de llamada a la acción ("Enviar código de 6 dígitos") si detecta una cadena en el `email` válida.


## [1.5.1] - 2026-04-02
### Added
- **Skeletons de Precisión (`app/(tabs)/index.tsx`)**: Implementación de estados de carga precisos (`loading ? ...`) que imitan el alto tipográfico del diseño final (`h-[28px]` / `h-[34px]`) para eliminar los saltos visuales (*layout shift*) al navegar entre historiales de meses.

### Changed
- **Estado Activo "En curso" (`components/ui/GradientFooter.tsx`)**: Refactor de la jerarquía visual para que el botón "En curso" solo se muestre activo si el usuario está viendo el mes actual calendario (calculado vía context), en lugar de basarse puramente en la ruta nativa.
- **Teclado Nativo Captura (`app/(tabs)/captura.tsx`)**: Se descartó la animación problemática del componente nativo `KeyboardAvoidingView` en favor de un sistema rígido de paddings basado en el API raw de `Keyboard`. Esto elimina los *glitches* que se presentaban al entrar a la tabulación.
- **Transición de Tipos de Teclado**: Se incluyó un mecanismo de *debounce* (50ms) en la pantalla de captura y en el footer flotante que intercepta la caída al suelo de la UI cuando el SO cambia del teclado numérico (`Monto`) al alfanumérico (`Descripción`), puenteando el layout para mantener la vista estable en pantalla.

## [1.5.0] - 2026-04-02
### Added
- **Vista de Meses Anuales (`app/(tabs)/meses.tsx`)**: Nueva pantalla que muestra un grid semántico de todos los meses del año y sus totales. Incluye navegación reactiva al contexto global (hacer tap en un mes cambia la vista principal al instante).

### Changed
- **Navegación Dashboard (`app/(tabs)/index.tsx`)**: El título principal del mes ("Marzo", etc.) es ahora un botón `Pressable` con un icono `CaretRight` que abre la vista histórica.
- **Ruteo de Footer (`components/ui/GradientFooter.tsx`)**: El footer ahora mantiene encendido el tab "Gastos" al navegar hacia la vista de meses. El submenú "En curso" cambia su opacidad (`text-muted-foreground` y `bg-transparent`) para reflejar la jerarquía.
- **Servicios de API (`services/api.ts`)**: Se integró la función `fetchGastosAnuales` para consumir el nuevo endpoint matemático de Railway.

# Changelog

All notable changes to the **Expense Tracker (Mobile)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.4.2] - 2026-03-29
### Changed
- **UI Design Tokens Migration**: Refactored `login.tsx`, `verify.tsx`, `captura.tsx`, `categorias.tsx`, `cuenta.tsx`, `index.tsx`, `CategorySelector`, `GradientFooter`, `Input`, `PaymentMethodSelector`, and `SuccessNotification` to eliminate hardcoded hexadecimal colors and spacing values (`#111217`, `24px`, etc.). Replaced them with the monorepo's shared Tailwind semantic tokens (`bg-background`, `px-xl`, `text-body`).
- **OTP Screen Overhaul**: Completely redesigned the `cuenta.tsx` verify OTP input into a visual 6-digit input mimicking a native PIN code layout with a blinking cursor and custom error state.
- **Success Modals**: Replaced the native OS `Alert.alert` on email change success with a fully custom, theme-compliant `Modal` overlay component in `cuenta.tsx`.

## [1.4.1] - 2026-03-28
### Added
- **Global `cssInterop`:** Created `lib/icons.ts` to natively support mapping Tailwind semantic classes to `color` props on external SVGs (`@expo/vector-icons`, `phosphor-react-native`).

### Changed
- **NativeWind Prop Migrations:** Removed broken `color="hsl(...)"` properties across `cuenta.tsx`, `captura.tsx`, and `GradientFooter.tsx`. Delegated all color handling strictly to `className` modifiers.
- **TextInput Placeholders & Cursors:** Removed manual `placeholderTextColor` and `cursorColor` definitions globally. Switched to `placeholder:text-muted-foreground caret-foreground` via Tailwind NativeWind syntax.

### Fixed
- **Black Icon & Placeholder Glitch:** Fixed a critical rendering issue where React Native core failed to parse CSS variables inside non-style props, defaulting all dynamic inputs and vectors to black.

## [1.4.0] - 2026-03-25
### Added
- **Design Tokens Sync:** Dynamic import of typography and spacing scales in `tailwind.config.js` pointing directly to the monorepo's single source of truth (`packages/ui/tokens.js`).
- **Phosphor Icons:** Integrated `phosphor-react-native` and completely replaced `@expo/vector-icons` (Feather/Lucide) across all app components to match the updated UI Kit.
- **Inter Font Mappings:** Wired the `Inter` font files (loaded in `_layout.tsx`) into the NativeWind/Tailwind CSS font-family config to ensure classes like `font-medium` properly trigger the designated font weight.

### Changed
- **Bottom Tab Navigation (GradientFooter):** Massive UI refactor completely moving away from a solid black bar layout to a "Floating Islands" design. Added precise `idle`/`active` states utilizing Phosphor filled icons and pill highlights.
- **Configuraciones Screen:** Restructured settings sections to perfectly match the 1:1 Figma design groups. Removed obsolete arbitrary horizontal paddings in favor of an inherited wrapper spacing pattern (`gap-xl` / 24px).
- **Movimientos Screen (Dashboard):** Simplified the layout significantly. Hid category/payment filters. Upgraded the structural layout to match Figma spacing (`gap-xl`).
- **Data Grouping (Gastos):** Completely overhauled the `index.tsx` date parser logic to aggregate expenses by dates labeled `"Hoy"`, `"Ayer"`, and short weekday strings (e.g. `"Jue 26"`). Added critical fallback fixes to prevent `Invalid Date` crashes from incoming API strings `DD/MM/YYYY`.
- **ExpenseItem Component:** Redesigned into a minimalist pill configuration, eliminating the previous multi-icon and category badge indicators. Set flex limits (`flex-1`, `numberOfLines`) for strict visual containment.

### Removed
- Removed `@expo/vector-icons` UI dependencies.
- Removed legacy arbitrary `[16px]` bracket properties in all refactored CSS classes for strict token usage (`text-body`, `p-sm`).

## [1.3.0] - 2026-03-11
### Added
- **OTP Authentication View:** Added `verify.tsx` screen to handle 6-digit email codes instead of magic links.
- **Reactive Routing:** Added an `InitialLayout` inside `app/_layout.tsx` that reacts to the AuthContext state to navigate between `(auth)` and `(tabs)`.
- **React Native Reusables (RNR) Primitives:** Added `Button`, `Progress`, `Separator`, and `Text` base components.
- **Settings Screen (Configuraciones):** Created new settings view with `MenuItem` and `SectionHeader` components, including an action to sign out (Cerrar sesión).
- **Form Selectors:** Added `CategorySelector` and `PaymentMethodSelector` components for the capture form.

### Changed
- **Login Flow:** Switched from `signInWithOtp` with magic links to 6-digit OTP codes.
- **Supabase Auth Configuration:** Disabled `detectSessionInUrl` and removed the `useDeepLinkHandler` utility since deep links are no longer required for auth.
- **API Client Auth:** Updated `services/api.ts` to automatically inject the Supabase user JWT token in the `Authorization` header for all requests.
- **Shared Tokens:** Migrated emoji token mappings (`EMOJIS_CAT`) to use the monorepo shared package `@expenses/ui/tokens`.

### Removed
- **Auth Callback Screen:** Removed `callback.tsx` as auth is now verified natively in the UI.
- **Expo Linking listeners:** Dropped listeners handling deep-linked tokens.

## [1.2.0] - 2026-02-28
### Added
- **React Native Reusables (RNR):** Added integration with `@react-native-reusables/cli`.
- **UI Theme Configuration:** Created `lib/theme.ts` with `NAV_THEME` for `react-navigation` color synchronization.
- **Utils File:** Created `lib/utils.ts` providing the `cn()` utility for Tailwind class merging.
- **CSS Variables:** Mapped strict Shadcn UI CSS variables (e.g. `--background`, `--card`, `--radius`) into `global.css` for both light and dark (`.dark`) themes.

### Changed
- **Tailwind Configuration:** Expanded `tailwind.config.js` to dynamically read HSL CSS variables for accurate component styling and injected radius calculations.


## [1.1.0] - 2026-02-25
### Added
- **Global State Context:** Implemented `GastosContext` to serve as a Single Source of Truth for sharing expense data across tabs.
- **Skeleton Loaders:** Integrated pre-rendered gray wireframe blocks in `index.tsx` (Dashboard) and `categorias.tsx` to completely eliminate UI layout jumping (shifts) during API fetches.
- **Background Sync:** Implemented silent data refreshing on the global context when a new expense is successfully saved in `captura.tsx`.

### Changed
- **Unified Header UI:** Standardized the top headers (Month and Total Amount) across both "Mes en curso" and "Categorías" views to provide a seamless filtering experience.
- **Optimized Network Calls:** Removed aggressive `useFocusEffect` hooks that forcefully refetched data from Railway API upon every tab switch, heavily reducing backend load.
- **Removed Disruptive Spinners:** Replaced central `ActivityIndicator` loading blocks with structural skeletons and native pull-to-refresh (`RefreshControl`), improving user perception of speed.

### Removed
- **Static Mock Data:** Replaced the static vision-model data array in `categorias.tsx` with dynamic backend connectivity.
- **Inline API Calls:** Fully abstracted inline fetch/mutation logic to centralized hooks (`useGastos`, `useGastoMutation`).

## [1.0.0] - 2026-02-24
### Added
- Initial release of the React Native (v0.81.5) and Expo (v54) mobile application.
- Custom REST API integration hosted on Railway.
- NativeWind (Tailwind CSS) integration with strict design tokens (spacing, colors, typography).
- Custom transparent Bottom Tab Bar (`GradientFooter`).
- Filter by category utilizing Horizontal Scroll View.
- Capture screen for adding new expenses with Keyboard Avoiding View.

## [0.4.0] - 2026-03-28
### Added
- `cuenta.tsx` screen to handle user email modifications using OTP (`verifyOtp`).
- `@react-native-community/datetimepicker` integrated in `captura.tsx`.
- Reusable `SuccessNotification.tsx` toast component.
- Reusable `Input.tsx` shared component.

### Changed
- Replaced all hardcoded hexadecimal colors with semantic Tailwind classes (e.g. `bg-background`, `text-warning`).
- Re-architected `captura.tsx` form positioning to precisely match Figma dimensions, sitting seamlessly above native keyboards.
- Re-engineered `GradientFooter.tsx` to conditionally hide its fade gradient on sub-less views (e.g., `cuenta`, `configuraciones`).
- Overhauled date grouping in `index.tsx` to use precise `Date` sorting and `Map` to guarantee desc date order.

### Fixed
- Addressed iOS/Android keyboard flickering (glitches) between numeric and text input transitions using a 100ms debounce in keyboard hide listeners.
- Prevented keyboard from overlapping the `captura.tsx` form.## [1.5.0] - 2026-03-29
### Added
- **Global Alert System**: Created a unified `Alert.tsx` (Dialog-style) component supporting `success`, `warning`, `error`, and `info` types. Implemented it across the app to completely replace native `Alert.alert` dialogs, handling cases like Supabase cooldown times securely.
- **Global Notification System**: Refactored `SuccessNotification.tsx` into a generic `Notification.tsx` (Pill-style) component.

### Changed
- **OTP Form Recovery**: Allowed the user to edit the email input natively during the `isVerifying` stage in `cuenta.tsx`. When edited, the system smoothly reverts to the initial email modification state, dropping the previous OTP code and error states.
- **Keyboard Handling (Captura)**: Solved critical rendering bugs where the form was hidden under the native keyboard. Migrated back to a robust `KeyboardAvoidingView` with `behavior="padding"` while actively tracking OS keyboard heights and dismissing the numeric pad safely before triggering the DatePicker.
- **Component Renaming**: Consolidated confusing legacy notification files strictly into `Alert.tsx` (large modals) and `Notification.tsx` (small floating pills).
\n## [1.6.0] - 2026-04-05\n### Added\n- **UI Playground & Mock Environment**: Added `app/playground.tsx` as an isolated Kitchen Sink to test React Native UI components directly in the browser (`npm run web`).\n- Added `react-native-web` and `@expo/metro-runtime` dependencies to strictly support browser rendering of the Expo Router architecture.\n- Added an `EXPO_PUBLIC_USE_MOCKS` flag to bypass Supabase authentication and intercept API calls inside `services/api.ts` and `contexts/AuthContext.tsx`, replacing them with realistic async dummy data.
