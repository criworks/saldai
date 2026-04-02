

## [1.6.0] - 2026-04-02
### Added
- **Vista de Meses Anuales (`mobile/app/(tabs)/meses.tsx`)**: Nueva pantalla en la app móvil que muestra un resumen de gastos totales agrupados por mes para el año en curso. Cumple estrictamente con los Design Tokens de la arquitectura.
- **Endpoint Analítico (`GET /gastos/anuales`)**: Nuevo endpoint protegido en la API (`api/server.js`) que agrupa y totaliza matemáticamente los montos anuales por mes (0-11) para evitar que el cliente móvil procese históricos completos.

### Changed
- **Navegación Dashboard (`mobile/app/(tabs)/index.tsx`)**: El título principal del mes ("Marzo", etc.) es ahora un área interactiva que dirige a la nueva vista anual.
- **Jerarquía Footer (`mobile/components/ui/GradientFooter.tsx`)**: La barra de navegación inferior ahora reconoce la vista "meses" como parte del ecosistema de gastos, manteniendo el icono principal iluminado y apagando sutilmente la píldora de "En curso".

# Changelog

All notable changes to the **Expense Tracker (Monorepo)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-11
### Added
- **Global Documentation:** Relocated `REPORT.md` to the project root to centralize technical learning and session histories.
- **Agent Tooling:** Promoted the `end-session` Gemini skill from the mobile workspace to the root `.gemini/skills/` directory to manage monorepo-wide versions.
- **Architectural Rules:** Added rule #8 to root `GEMINI.md` formalizing the separation between monorepo changelogs and mobile-specific changelogs.

## [0.4.0] - 2026-03-28
### Added
- Official `design-tokens` skill in `.gemini/skills/` to automate design-to-tokens conversion.
- Global design tokens for warning and active states (`#E98B00`, `#5B3600`, `#353A47`) to `packages/ui/tokens.js`.
### Changed
- Promoted design tokens to be strictly semantic across the monorepo.

