# Changelog

All notable changes to the **Saldai (Monorepo)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]
### Added
- **Tests del parser (API)**: Suite real con `node:test` en `api/test/` (41 casos) para `parser`, `categorizer` y `dateParser`. `npm test` ahora corre los tests; la demo con salida en colores quedó como `npm run demo`.

### Fixed
- **Monto con sufijo k**: `12.5k` se leía como 125.000 y `1.5k` como 15.000. Con sufijo `k` el punto o la coma son separador decimal, así que ahora son 12.500 y 1.500.
- **Categorización por palabra completa**: `gaseosa` caía en Básicos por contener "gas" y `barbería` en Ocio por contener "bar". El match ahora es por palabra completa, sin acentos y aceptando el plural ("auriculares" matchea "auricular").
- **Fechas inválidas**: `31/02` guardaba otro día en silencio. Ahora devuelve error y el gasto no se parsea.
- **Zona horaria**: el "hoy" se calcula en `America/Santiago` (configurable con `APP_TIMEZONE`) y no en UTC, así un gasto cargado a las 22:00 en Chile ya no quedaba con la fecha del día siguiente.
- **Health check de base de datos**: `GET /health/db` usaba una variable `supabase` inexistente y siempre respondía 500 sin llegar a la base. Ahora crea un cliente anónimo (`createAnonClient`) y la consulta sí viaja a Supabase.

### Changed
- **Prioridad de categorías**: Mercado se evalúa antes de Básicos para que "acuenta" (supermercado) no caiga en "cuenta".
- **Keywords**: agregadas `metrogas`, `lipigas`, `abastible` (Básicos) y `apple tv` / `appletv` (Suscripciones).
- **Validación de entorno**: nuevo `api/src/config.js`. La API no arranca si faltan `SUPABASE_URL` o `SUPABASE_ANON_KEY`, y avisa por consola cuando falta una variable opcional. Los orígenes de CORS se filtran, así que ya no se registran entradas `undefined`.
- **Middleware de autenticación**: `auth.js` pasó de `import/export` (ESM) a CommonJS, igual que el resto de la API. Deja de depender de la versión de Node que elija el host.
- **Versión de Node fijada**: `engines: node >=22 <23` en la raíz y en `api/`, más `.node-version` para Render.

### Removed
- **Endpoint `POST /test-email`**: cualquier usuario autenticado podía enviar correos arbitrarios desde la cuenta de Resend del proyecto. El servicio `src/services/email.js` se mantiene para uso interno.

## [Unreleased]
### Changed
- **`.gitignore`**: reescrito. Era una plantilla de Python en un monorepo de JavaScript (ignoraba `__pycache__`, `*.egg-info`, `.pybuilder/` y hasta `.git/`). Ahora está agrupado por tema y solo ignora lo que corresponde.
- **Un solo lockfile**: `package-lock.json` de la raíz se versiona (es el del monorepo y lo que hace reproducible `npm ci`) y se ignoran los de cada workspace. Antes el `.gitignore` decía ignorarlos todos, pero el de la raíz estaba versionado igual.
- **Dependencias de mobile declaradas**: `@supabase/supabase-js` y `@saldai/ui` se usaban sin declararse y funcionaban solo porque npm las subía (hoisting) desde `api`. Un cambio en las dependencias de la API podía romper mobile sin tocar mobile.

### Added
- **Scripts en la raíz**: `npm run lint` (web) y `npm run typecheck` (mobile), además del `npm test` que ya estaba. Es lo que va a correr CI.


## [1.7.2] - 2026-04-12
### Changed
- **Dependencias API**: Refactorizado el middleware de autenticación (`auth.js`) para utilizar el SDK nativo de Supabase (`supabase.auth.getUser`) en la validación de tokens JWT en lugar del método manual usando llaves públicas.
- **Manejo de Errores Async (API)**: Integrado `express-async-errors` en el archivo raíz de Express 4 para garantizar que el runtime intercepte rechazos no cacheados en las promesas y evite timeouts en la base de datos.

### Removed
- **Validadores de Tokens**: Desinstalados `jsonwebtoken` y `jwks-rsa` de la API.

## [1.7.1] - 2026-04-11
### Added
- **Componentización de Autenticación**: Nuevos componentes reutilizables `EmailVerificationInput` y `OtpVerification` compartidos entre los flujos de inicio de sesión y cuenta.
- **Validación de Correo**: Función global `isValidEmail` integrada para restringir acciones (botón "Enviar código") hasta que el formato introducido sea válido.

### Changed
- **Refactorización de Verificación (OTP)**: UX alineada entre `login.tsx` y `cuenta.tsx`. Eliminado el botón "Usar otro correo".
- **Refactorización de Alertas (`Alert`)**: Implementado soporte `inline` para mostrar notificaciones críticas embebidas bajo campos de texto o botones en lugar de usar posición flotante absoluta.
- **Notificaciones de Éxito (`Notification`)**: Modificados los comportamientos en el reenvío de OTP para presentar notificaciones tipo "toast" en vez de las alertas previas. Se ajustó el sistema para no fijar alturas forzadas que causaban cortes tipográficos (clipping text).
- **Iconografía**: El icono de espera al solicitar un código temporal en campos de email cambió a blanco para mantener consistencia visual global.

## [1.7.0] - 2026-04-07
### Added
- **Integración de Emails**: Servicio de envíos configurado en la API vía Resend (`api/src/services/email.js`).
- **Endpoint de Prueba de Email**: Añadido endpoint protegido `POST /test-email` en el backend para validaciones rápidas.

### Changed
- **Rebranding Completo**: Renombrado global del proyecto de "Expense Tracker" a "Saldai".
- **Workspaces**: Actualización masiva de nombres de paquetes internos (`@saldai/ui`, `saldai-api`, `saldai-web`, `saldai-mobile`).
- **Configuración Móvil**: Actualización del package bundle a `com.crirun.saldai` y el nombre de la app.
- **Configuración Web**: Actualización de Metadata a "Saldai" en Next.js.
- **Backoffice**: Remitente de email de Resend actualizado.

## [1.6.0] - 2026-04-02
### Added
- **Soporte de Autenticación**: Nuevo sistema de Auth middleware (`/api/src/middleware/auth.js`) integrado para proteger las rutas de gastos y categorías.
- **Flujo de Acceso Móvil**: Nuevas pantallas `login.tsx` y layouts en la app para soportar el flujo Supabase OTP.

### Changed
- **Base de Datos y API**: Refactorizado `supabase.js` para crear el cliente con los tokens provistos por el cliente en cada request, respetando RLS.
- **Mobile Context**: Actualizado `GastosContext` y `AuthContext` para interceptar validaciones de estado y limpiar la data local al desconectarse.