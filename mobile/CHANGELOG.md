# CHANGELOG

## [1.5.5] - 2026-04-11
### Added
- **Componentización de Autenticación**: Nuevos componentes reutilizables `EmailVerificationInput` y `OtpVerification` (integrando a su vez a `OtpInput` y `Alert`) compartidos entre `login.tsx` y `cuenta.tsx`.
- **Validación de Correo**: Función global `isValidEmail` añadida en `lib/utils.ts` e integrada para ocultar o deshabilitar acciones primarias en flujos de email hasta que el formato introducido sea válido.

### Changed
- **Refactorización de Verificación (OTP)**: UX completamente alineada entre `login.tsx` y `cuenta.tsx`. El usuario ahora puede simplemente editar su email para volver a solicitar un código (eliminando el botón redundante "Usar otro correo").
- **Refactorización de Alertas (`Alert`)**: Implementado soporte `inline={true}`. Las alertas que proveen mensajes contextuales sobre acciones del usuario ahora se empotran debajo del contenido, eliminando las colisiones con notificaciones globales flotantes.
- **Notificaciones de Éxito (`Notification`)**: Modificado el componente y el uso de éste. Se eliminó la altura fija (`h-[33px]`) del layout de la pastilla para solucionar problemas de texto cortado.
- **Acciones de Reenvío de OTP**: Los flujos de reenvío de códigos temporal en login y cuenta ahora invocan un toast verde informativo transitorio en la parte superior (`Notification`) en lugar de mostrarse mediante una alerta tipo box (`Alert`).
- **Iconografía Consistente**: El icono temporal de espera (reloj) cuando se aguarda por validación ahora es blanco, unificando la escala de paleta.

## [1.5.4] - 2026-04-11
### Added
- **Arquitectura de QA Offline (Mocks Globales)**: Se implementó un robusto ecosistema de simulación de red inyectado vía `EXPO_PUBLIC_USE_MOCKS=true`.
- **UI Playground Controls**: Se agregó una botonera global al `app/playground.tsx` capaz de mutar el estado global mockeado de la aplicación (`mockFeedConfig.state`) en tiempo real (forzar errores de red, listas vacías, listas gigantes, carga infinita).
- **Simulación Supabase Auth (`supabase.ts`)**: Se interceptaron los métodos `signInWithOtp`, `updateUser` y `signOut` devolviendo latencias falsas realistas de 800ms.
- **Magic Strings de Testing**: El hook de captura de gastos y Auth ahora reconoce emails/textos mágicos (`"error api"`, `"error rate"`, `"long espera"`) para devolver excepciones nativas y probar el comportamiento asíncrono y los límites de la UI.
- **Soporte de Layout de Errores Global (`GastosContext.tsx`)**: Se agregó un `error` state al contexto principal para capturar excepciones emitidas por la red (o el Mocker) y devolver Fallbacks visuales con botones de reintento en el Feed Principal y en Historial de Meses.
- **Casos Borde Visuales**: Se crearon instancias de estrés extremo en el Playground usando el componente `ExpenseItem` con valores absurdamente grandes para validar el sistema Flexbox contra roturas de línea en Tailwind.

### Changed
- **Desacople en AuthContext**: En lugar de asignar la sesión dummy instantáneamente en modo Mock, `AuthContext.tsx` ahora expone `triggerMockSession()`. Esto requiere una "negociación" simulada y permite transiciones visuales (`setTimeout`) que replican el tiempo de latencia 1:1 de Producción.
- **Comentarios Dead-code**: Documentado extensivamente todo el código falso con comentarios indicando explícitamente al Developer que esto no afecta Producción porque el Bundler lo elimina durante el Tree Shaking estático de variables `process.env`.
- **Deshabilitación Responsiva (`captura.tsx`)**: El motor de NLP de captura de gastos ahora inhabilita visualmente los inputs (opacity-50) y muestra spinners in-line de forma reactiva mientras la API resuelve las promesas, evitando el "doble guardado" accidental por parte del usuario.

## [1.5.3] - 2026-04-11
### Added
- **Componente OTP Reutilizable**: Se extrajo la lógica de renderizado de PIN visual (con el cursor intermitente de 500ms y los puntos reactivos) a un nuevo componente compartido `<OtpInput />` (`mobile/components/ui/OtpInput.tsx`). Esto asegura un comportamiento uniforme de los inputs de verificación a través de toda la aplicación.