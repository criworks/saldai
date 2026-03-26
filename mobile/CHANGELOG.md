# Changelog

All notable changes to the **Expense Tracker (Mobile)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
