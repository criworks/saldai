# Changelog

All notable changes to the **Saldai (Monorepo)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]
### Added
- **`@saldai/core`**: paquete nuevo con el dominio compartido, sin framework y sin red: el catálogo de categorías y su regla de match, los métodos de pago, el formato de montos en pesos y las conversiones y rangos de fechas. Lo consumen la API y mobile (y web cuando le toque), así que un gasto significa lo mismo en todas las salidas. 23 tests propios; `npm test` en la raíz ahora corre los del core y los de la API.
- **Tests del parser (API)**: Suite real con `node:test` en `api/test/` (41 casos) para `parser`, `categorizer` y `dateParser`. `npm test` ahora corre los tests; la demo con salida en colores quedó como `npm run demo`.
- **Scripts en la raíz**: `npm run lint` (web) y `npm run typecheck` (mobile), además del `npm test` que ya estaba. Es lo que va a correr CI.
- **Development build con EAS**: nuevo `mobile/eas.json` con los perfiles `development`, `preview` y `production`, más `expo-dev-client` y los scripts `build:dev:android` / `build:dev:ios`. Expo Go queda atado a su versión de SDK y deja de abrir el proyecto cuando se actualiza; el development build es la app del proyecto y no depende de eso.
- **Migraciones de Supabase versionadas** (`supabase/migrations/`): hasta ahora el schema se editaba a mano desde el dashboard y el proyecto no tenía ninguna migración registrada. Incluye un baseline del estado actual de `public.gastos`.
- **`public.delete_user()`**: la pantalla de configuraciones llamaba esta función para borrar la cuenta, pero nunca existió. Borra los gastos y la cuenta del usuario de la sesión, con `security definer` acotado.
- **Políticas RLS de UPDATE y DELETE** en `public.gastos`: la tabla solo tenía SELECT e INSERT, así que editar o borrar un gasto fallaba en silencio.
- **Índice `(user_id, creado_en desc)`** en `public.gastos`: la tabla solo tenía el índice de la primary key, y ninguna consulta de la app busca por id.

### Fixed
- **Mobile mostraba categorías y montos que no existen**: los mocks inventaban "Comida", "Despensa", "Test" y "Mock", que ningún selector ni color conocía, y formateaban el monto como `$15,000.00` en vez de `$15.000`. Ahora se arman desde el catálogo y el formateador del core, así que el modo mock se ve como producción.
- **El selector de método no marcaba nada en el playground**: el estado inicial era `'tc'` en minúscula y los botones comparaban contra `'TC'`. Los dos lados salen ahora de `METODO_DEFAULT`.
- **Listas duplicadas que se podían desincronizar**: los nombres de los meses estaban escritos a mano en `mobile/constants/theme.ts`, el formato de monto estaba repetido en ocho lugares de mobile y los emojis y colores de categoría eran una lista paralela a la de la API. Todo eso sale ahora del core, y los emojis y colores se derivan del catálogo, así que una categoría nueva no puede quedar con keywords en la API pero sin nada que mostrar. El dashboard web mantiene sus propias copias por ahora, porque web está en pausa; se migra cuando se retome.
- **Build de desarrollo pedía instalar `expo-updates`**: los tres perfiles de `mobile/eas.json` declaraban un `channel`, y un channel solo tiene sentido con `expo-updates` instalado, que no lo está. EAS interrumpía cada build para ofrecer instalarlo. Se quitaron los `channel`; vuelven cuando adoptemos actualizaciones OTA.
- **`GET /gastos?mes=` mezclaba años**: el filtro era `fecha ilike '%/10/%'`, que devolvía octubre de todos los años. Ahora `fecha` es una columna `date` y el filtro es un rango `[primer día del mes, primer día del siguiente)`. El endpoint acepta `anio` opcional y, sin él, asume el año en curso.
- **Monto con sufijo k**: `12.5k` se leía como 125.000 y `1.5k` como 15.000. Con sufijo `k` el punto o la coma son separador decimal, así que ahora son 12.500 y 1.500.
- **Categorización por palabra completa**: `gaseosa` caía en Básicos por contener "gas" y `barbería` en Ocio por contener "bar". El match ahora es por palabra completa, sin acentos y aceptando el plural ("auriculares" matchea "auricular").
- **Fechas inválidas**: `31/02` guardaba otro día en silencio. Ahora devuelve error y el gasto no se parsea.
- **Zona horaria**: el "hoy" se calcula en `America/Santiago` (configurable con `APP_TIMEZONE`) y no en UTC, así un gasto cargado a las 22:00 en Chile ya no quedaba con la fecha del día siguiente.
- **Health check de base de datos**: `GET /health/db` usaba una variable `supabase` inexistente y siempre respondía 500 sin llegar a la base. Ahora crea un cliente anónimo (`createAnonClient`) y la consulta sí viaja a Supabase.
- **Errores de la API en mobile**: `fetchGastosPorMes` y `fetchGastosAnuales` leían `error` de la respuesta, pero la API siempre responde `errores: string[]`. El detalle se perdía y siempre se mostraba el texto genérico. Ahora se leen todos los mensajes, y los del parser (que vienen varios juntos) se muestran completos.
- **Tipos de mobile en cero**: el cliente de Supabase se exportaba como `any` por el ternario del modo mock, así que todo lo que lo usaba perdía los tipos. Queda anotado como `SupabaseClient`. Además `<Portal>` de `@rn-primitives/portal` requiere la prop `name`, que faltaba en `ConfirmationModal`.
- **Eliminar cuenta en mobile**: si la llamada a `delete_user` fallaba, la app lo registraba con `console.warn`, cerraba sesión y mostraba "Cuenta eliminada correctamente" igual. Ahora el error se muestra y la sesión no se cierra.

### Changed
- **Identificadores de la app alineados con la marca**: en `mobile/app.json`, `slug` pasa de `expense-tracker` a `saldai`, `scheme` de `gastos` a `saldai` y el package de Android de `com.crirun.expensestracker` a `com.crirun.saldai`, más el `bundleIdentifier` de iOS que faltaba. El package de Android no se puede cambiar después de publicar en Play Store, así que había que hacerlo antes del primer release. Como el slug de un proyecto de Expo no se puede editar, el proyecto en expo.dev se recreó con el slug `saldai` y el `projectId` apunta al nuevo; no se perdió nada porque todavía no había builds ni keystore.
- **`gastos.fecha` es `date` y no text**: guardarla como `DD/MM/AAAA` impedía filtrar y ordenar por fecha. La migración convierte los datos existentes y agrega el índice `(user_id, fecha desc)`. La API devuelve `fecha` en ISO (`AAAA-MM-DD`) y agrega `fechaFormateada` (`DD/MM/AAAA`) para mostrar, igual que `monto` y `montoFormateado`.
- **Prioridad de categorías**: Mercado se evalúa antes de Básicos para que "acuenta" (supermercado) no caiga en "cuenta".
- **Keywords**: agregadas `metrogas`, `lipigas`, `abastible` (Básicos) y `apple tv` / `appletv` (Suscripciones).
- **Validación de entorno**: nuevo `api/src/config.js`. La API no arranca si faltan `SUPABASE_URL` o `SUPABASE_ANON_KEY`, y avisa por consola cuando falta una variable opcional. Los orígenes de CORS se filtran, así que ya no se registran entradas `undefined`.
- **Middleware de autenticación**: `auth.js` pasó de `import/export` (ESM) a CommonJS, igual que el resto de la API. Deja de depender de la versión de Node que elija el host.
- **Versión de Node fijada**: `engines: node >=22 <23` en la raíz y en `api/`, más `.node-version` para Render.
- **`.gitignore`**: reescrito. Era una plantilla de Python en un monorepo de JavaScript (ignoraba `__pycache__`, `*.egg-info`, `.pybuilder/` y hasta `.git/`). Ahora está agrupado por tema y solo ignora lo que corresponde.
- **Un solo lockfile**: `package-lock.json` de la raíz se versiona (es el del monorepo y lo que hace reproducible `npm ci`) y se ignoran los de cada workspace. Antes el `.gitignore` decía ignorarlos todos, pero el de la raíz estaba versionado igual.
- **Dependencias de mobile declaradas**: `@supabase/supabase-js` y `@saldai/ui` se usaban sin declararse y funcionaban solo porque npm las subía (hoisting) desde `api`. Un cambio en las dependencias de la API podía romper mobile sin tocar mobile.
- **Políticas RLS existentes**: acotadas al rol `authenticated` (antes `public`, que incluye `anon`) y con `auth.uid()` envuelto en `(select ...)`, que es lo que pedía el advisor de performance de Supabase.

### Removed
- **Endpoint `POST /test-email`**: cualquier usuario autenticado podía enviar correos arbitrarios desde la cuenta de Resend del proyecto. El servicio `src/services/email.js` se mantiene para uso interno.


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