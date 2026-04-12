# Changelog

All notable changes to the **Saldai (Monorepo)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


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