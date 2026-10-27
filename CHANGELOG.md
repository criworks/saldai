# Changelog

All notable changes to the **Saldai (Monorepo)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]
### Fixed
- **Health check de base de datos**: `GET /health/db` usaba una variable `supabase` inexistente y siempre respondía 500 sin llegar a la base. Ahora crea un cliente anónimo (`createAnonClient`) y la consulta sí viaja a Supabase.

### Changed
- **Validación de entorno**: nuevo `api/src/config.js`. La API no arranca si faltan `SUPABASE_URL` o `SUPABASE_ANON_KEY`, y avisa por consola cuando falta una variable opcional. Los orígenes de CORS se filtran, así que ya no se registran entradas `undefined`.
- **Middleware de autenticación**: `auth.js` pasó de `import/export` (ESM) a CommonJS, igual que el resto de la API. Deja de depender de la versión de Node que elija el host.
- **Versión de Node fijada**: `engines: node >=22 <23` en la raíz y en `api/`, más `.node-version` para Render.

### Removed
- **Endpoint `POST /test-email`**: cualquier usuario autenticado podía enviar correos arbitrarios desde la cuenta de Resend del proyecto. El servicio `src/services/email.js` se mantiene para uso interno.

## [Unreleased]
### Added
- **Migraciones de Supabase versionadas** (`supabase/migrations/`): hasta ahora el schema se editaba a mano desde el dashboard y el proyecto no tenía ninguna migración registrada. Incluye un baseline del estado actual de `public.gastos`.
- **`public.delete_user()`**: la pantalla de configuraciones llamaba esta función para borrar la cuenta, pero nunca existió. Borra los gastos y la cuenta del usuario de la sesión, con `security definer` acotado.
- **Políticas RLS de UPDATE y DELETE** en `public.gastos`: la tabla solo tenía SELECT e INSERT, así que editar o borrar un gasto fallaba en silencio.
- **Índice `(user_id, creado_en desc)`** en `public.gastos`: la tabla solo tenía el índice de la primary key, y ninguna consulta de la app busca por id.

### Fixed
- **Eliminar cuenta en mobile**: si la llamada a `delete_user` fallaba, la app lo registraba con `console.warn`, cerraba sesión y mostraba "Cuenta eliminada correctamente" igual. Ahora el error se muestra y la sesión no se cierra.

### Changed
- **Políticas RLS existentes**: acotadas al rol `authenticated` (antes `public`, que incluye `anon`) y con `auth.uid()` envuelto en `(select ...)`, que es lo que pedía el advisor de performance de Supabase.


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