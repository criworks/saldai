# Changelog

All notable changes to the **Expense Tracker (Mobile)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-03-12
### Changed
- **Design Guidelines Implementation:** Full refactor of `global.css`, `tailwind.config.js`, and `lib/theme.ts` to strictly adhere to the "Dark Mode First" palette and typographic scales (hero, title, subtitle, body, detail).
- **Layout Standardization:** Wrapped all main screens (`index.tsx`, `captura.tsx`, `categorias.tsx`, `configuraciones.tsx`) in `<View className="flex-1 w-full max-w-md mx-auto">` for mobile-first/desktop-scalable layouts. Standardized `paddingBottom` to `160px` for scroll views.
- **UI Components Refactor:** Updated `MenuItem.tsx` (fixed height and inverted colors) and `ExpenseItem.tsx` (rigid flexbox layout forcing amounts to the right edge).
- **FAB Morphology:** Changed the submit button in `captura.tsx` from a strict circle to an elongated pill `px-[32px] py-[12px]` as per guidelines.
- **Color Utility Usage:** Replaced all hardcoded hex values (e.g., `bg-[#111217]`, `text-[#60677D]`) with semantic Tailwind classes (e.g., `bg-background`, `text-muted-foreground`).

## [1.3.0] - 2026-03-11
### Added
- **OTP Authentication View:** Added `verify.tsx` screen to handle 6-digit email codes instead of magic links.
- **Reactive Routing:** Added an `InitialLayout` inside `app/_layout.tsx` that reacts to the AuthContext state to navigate between `(auth)` and `(tabs)`.

### Changed
- **Login Flow:** Switched from `signInWithOtp` with magic links to 6-digit OTP codes.
- **Supabase Auth Configuration:** Disabled `detectSessionInUrl` and removed the `useDeepLinkHandler` utility since deep links are no longer required for auth.

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
