# CHANGELOG

Todo lo que cambia en la **app de Saldai (mobile)** se documenta acá. Este
archivo es el que alimenta las notas de versión de las stores, así que lleva el
detalle de mobile: lo transversal al monorepo va en el `CHANGELOG.md` de la
raíz, que para los cambios de la app solo deja un puntero a este archivo.

El formato es [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) y las
versiones siguen [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Cada versión es `## [x.y.z] - AAAA-MM-DD` y debajo solo van secciones `### Added`,
`### Changed`, `### Deprecated`, `### Removed`, `### Fixed` o `### Security`,
una sola vez cada una. Lo verifica `npm run changelog:check`.

Las entradas nuevas van arriba, en `[Unreleased]`, y **solo se agregan**: una
entrada ya escrita no se modifica ni se borra. Las versiones de abril de 2026 se
reordenaron una vez, por pedido explícito, para que el archivo quedara dentro
del formato; el texto de cada entrada es el original.


## [Unreleased]
### Added
- **Una "x" para borrar todo lo escrito en un input**: mientras se escribe en el campo de email, el icono de la derecha pasa de ser el lápiz a una "x" que vacía el campo de una vez, en lugar de tener que borrar caracter por caracter. Aparece solo cuando el input está en foco y tiene algo escrito, que es el único caso donde hay qué borrar; al tocarla el input queda en foco y con el teclado abierto, listo para escribir de nuevo. La "x" es `components/ui/BotonLimpiar.tsx`, un primitivo sin dominio, así que el día que la captura la quiera es un import. Esa capa de iconos tenía `pointer-events-none` fijo, que se comía el tap sobre la "x", y ahora solo lo lleva cuando el icono es decorativo: sin esa condición, o la "x" no responde o el icono se come los taps sobre el borde derecho del input.
- **La pantalla de captura sugiere la categoría mientras se escribe**: el selector de categorías (y el de método de pago) estaban en la pantalla pero escondidos con `hidden`, así que no había forma de elegir categoría al cargar un gasto y uno se enteraba de cuál le tocó recién al guardarlo. Ahora se ven como en el diseño, y mientras se escribe la descripción la categoría que el parser deduce aparece atenuada; un tap la confirma, tocar otra la cambia y tocar la confirmada la suelta. La inferencia corre en el teléfono con `categorizar()` de `@saldai/core`, sin red, y es la misma regla que aplica la API cuando la categoría va vacía: lo que se sugiere es lo que se guardaría. El botón `+` ahora limpia la elección; antes mandaba "Sin categoría", que la API no reconoce y terminaba infiriendo del item igual.
- **Las categorías quedan apagadas en la v1 de la app**: `mobile/lib/funciones.ts` declara `CATEGORIAS_VISIBLES = false`, que esconde el selector de la captura (con su sugerencia en vivo), la fila de filtros por categoría de la lista y la entrada "Categorías" de configuraciones. Es una decisión de producto, por eso es una constante en el código y no una variable de entorno. La API sigue infiriendo y guardando la categoría de cada gasto, así que cuando se prenda en un release posterior los gastos de la v1 ya vienen categorizados.
- **El selector de método de pago también queda apagado en la v1**: `METODOS_VISIBLES = false` en `mobile/lib/funciones.ts`. Cada gasto se guarda con el método por defecto (TC), igual que mientras el selector estaba escondido.
- **Build instalable de mobile (`preview`)**: nuevo script `npm run build:preview:android` y el perfil `preview` de `eas.json` apuntando al environment de EAS con el mismo nombre. A diferencia del development build, empaqueta el JavaScript dentro del APK, así que la app funciona con el computador apagado; sigue siendo `distribution: internal`, no pasa por la Play Store. Requiere crear `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` en el dashboard de Expo, porque el bundle se arma en la nube y no ve el `.env` local.
- **`mobile/.env.example` documenta de dónde sale cada variable** y qué hace falta para un build de EAS, que era justamente lo que no estaba escrito. De paso `EXPO_PUBLIC_USE_MOCKS` queda comentado en vez de venir en `true`: copiar el archivo tal cual dejaba la app en modo mock, contra datos inventados, que es lo último que uno espera al configurar el proyecto por primera vez.
- **Development build con EAS**: nuevo `mobile/eas.json` con los perfiles `development`, `preview` y `production`, más `expo-dev-client` y los scripts `build:dev:android` / `build:dev:ios`. Expo Go queda atado a su versión de SDK y deja de abrir el proyecto cuando se actualiza; el development build es la app del proyecto y no depende de eso.
- **Atajos para revisar sin esperar un build**: el ciclo de revisión visual no necesita rebuildear. El development build no lleva el código adentro, lo baja del Metro de la máquina, así que todo cambio de JS, estilos o tokens entra por `npm start` con fast refresh; solo el código nativo obliga a un binario nuevo. Para esas veces se agregaron `npm run run:android` / `run:ios`, que compilan en la máquina en lugar de la nube: EAS buildea en una máquina efímera y no guarda la caché de Gradle, así que todos sus builds tardan parejo, mientras que localmente el segundo reusa casi todo. También `npm run start:clear`, que limpia la caché de Metro, y el perfil `development-simulator` de `eas.json` con `build:dev:ios:sim`, porque el perfil `development` declara `ios.simulator: false` y por eso no había forma de tener un dev client en el simulador de iOS. El README explica cuándo hay que rebuildear y cuándo no, y las dos limitaciones del emulador de Android para lo que más se está revisando: su teclado en pantalla viene apagado y es el de AOSP, y el edge-to-edge de Android 16 depende de las barras reales del dispositivo.
- **El APK de desarrollo y el de `preview` conviven en el teléfono**: los dos salían del mismo `app.json`, o sea del mismo `package` de Android, y para el sistema eran la misma app, así que instalar uno desinstalaba el otro — justo los dos que uno quiere tener a la vez, porque el de desarrollo hace rápida la revisión y el de preview funciona con el computador apagado. `mobile/app.config.js` le da identidad propia a la variante de desarrollo (`com.crirun.saldai.dev`, "Saldai (Dev)", esquema `saldai-dev` y fondo `#262A35` en el icono adaptativo, que distingue las dos apps en la grilla sin un asset nuevo); `preview` y `production` siguen siendo `com.crirun.saldai`, porque el APK de preview es la app de verdad. La variante la elige `APP_VARIANT`, que declara el perfil `development` de `eas.json` y repiten los scripts, porque el dev server tiene que calcular el mismo package que el APK instalado; sin la variable se asume producción. Cambiar el package es otra app para Android, así que pide un development build nuevo y EAS genera un keystore propio para él, sin tocar el de `com.crirun.saldai`. No había nada atado al package: el login es OTP por código y no por enlace, así que no hay redirect registrado en Supabase, y el `scheme` declarado no lo usaba nadie.
- **Los iconos de la app son los del diseño y no el placeholder de Expo**: `icon.png`, `adaptive-icon.png` y `splash-icon.png` eran todavía la grilla con círculos concéntricos que trae la plantilla en blanco. Ahora salen de los dos logos del Figma, uno por variante: la marca clara sobre el fondo oscuro para `preview` y producción, y la marca oscura entre chevrones sobre blanco para desarrollo, que se distinguen solos en la grilla del teléfono. Cada variante lleva dos archivos porque Android no usa una imagen sino dos piezas, la de adelante con la marca sola sobre transparencia y un color de fondo plano: `adaptive-icon*.png` es la marca recortada y centrada en la zona segura, escalada para verse del mismo tamaño que en el icono de iOS pese a que Android solo muestra el centro 72/108 del lienzo. El fondo del splash pasa de `#ffffff` a `#111217`, que es el de la app: con la marca clara sobre blanco no se veía nada.

### Changed
- **Los campos de texto son dos variantes de un solo `Input`**: el producto tiene dos formas de campo y hasta ahora ninguna estaba en un componente. La de login y cuenta (caja gris, borde que responde al foco, icono a la derecha) vivía en `Input` pero con el borde puesto desde la pantalla; la del código de 6 dígitos repetía esas mismas clases a mano, sin compartir nada; y los dos campos de la captura eran `TextInput` pelados. Ahora `Input` tiene `variante="con-fondo"` (la de auth) y `variante="sin-fondo"` (la de la captura, sin caja y sin icono), y el contorno de la primera se exporta como `cajaConFondo()` para que el campo del OTP lo use en vez de copiarlo. De paso: el borde ahora es siempre de 2px y solo cambia de color, así que el campo de email ya no se mueve un pixel al entrar y salir del foco; `Input` gana el estado atenuado que antes no tenía (el error se queda solo en el campo del código de 6 dígitos, que es el único diseñado); la expresión que pinta el texto según haya valor o no, que estaba escrita tres veces, queda en un solo lugar; y la altura compartida por campos y botones grandes pasa a ser el token `sizes.control` (clase `h-control`) en vez de un `h-[56px]` repetido en cinco archivos. El playground muestra las dos variantes con sus estados.
- **El aviso del código de 6 dígitos usa un buzón al crear la cuenta**: el aviso que explica que el código salió por email mostraba un reloj a 18px en los dos flujos que lo usan. Ahora en el flujo de crear cuenta (la pantalla de login) es un buzón a 24px, que dice "andá a ver tu email" en vez de "esperá"; el flujo de cambiar el email de una cuenta que ya existe (configuraciones → cuenta) se queda con el reloj. Son dos variantes de `Alert` (`pending` y `mailbox`) y `OtpVerification` recibe cuál usar, con el reloj por defecto, así que el flujo que no se pidió cambiar no se puede mover sin que un test se caiga.
- **Mobile se agrupa por feature y no por tipo de archivo**: `features/gastos/` y `features/auth/` juntan el estado, los componentes y las llamadas de cada parte del producto, en vez de repartirlos entre `contexts/`, `hooks/`, `services/` y `components/ui/`. En `components/ui/` quedan solo los primitivos sin dominio: cuatro de los que estaban ahí (`ExpenseItem`, `CategorySelector`, `PaymentMethodSelector`, `GradientFooter`) no eran reutilizables, y `GradientFooter` directamente leía los contextos de gastos y de filtro. Cada feature expone su superficie en un `index.ts` y las pantallas importan solo eso, así reacomodar una feature por dentro no toca las rutas. De paso se fue `hooks/useGastos.ts`, que era una línea reexportando el contexto.
- **Los imports de mobile pasan al alias `@/`**: 79 imports relativos (`'../../components/ui/Alert'`) quedaron como absolutos, que es lo que hacía legible mover archivos. El alias ya estaba en `tsconfig.json` pero casi no se usaba, y faltaba en Jest: se agregó el `moduleNameMapper` porque Jest no lee `tsconfig.json`. El bundle se verificó con un `expo export` de verdad, no solo con `tsc`.
- **Los mocks de mobile viven en `services/mocks/`** y no dentro de `services/api.ts`. Cada función de red empezaba con treinta líneas de respuestas simuladas antes de llegar al `fetch`, así que costaba ver qué hace la app de verdad; ahora `api.ts` tiene solo las llamadas reales y una línea que delega al mock cuando corresponde. Al tipar las respuestas con el contrato del core apareció que el mock de `POST /gastos` no devolvía `categoriaSrc` ni `fechaFormateada`, que la API sí manda.
- **Caché y alta optimista en mobile (react-query)**: cada pantalla tenía su propio `useState` + `fetch` + `useEffect`, así que volver a un mes que se había mirado hace diez segundos lo pedía de nuevo y dejaba la pantalla en esqueleto, y un error de red la dejaba vacía sin reintentar. Ahora los gastos del mes y los totales del año son consultas con caché (`mobile/lib/consultas.ts`): lo que ya se cargó se muestra al toque y se revalida detrás, y una consulta que falla se reintenta dos veces con espera creciente, que es lo que pide un celular. Guardar un gasto no se reintenta solo, a propósito: un reintento a ciegas puede duplicarlo. Y el gasto nuevo aparece en la lista antes de que la API responda, parseado en el celular con `@saldai/core` (por eso el parser se movió al core) y puesto en el mes al que pertenece por fecha, que no siempre es el que se está mirando; si la API lo rechaza, la lista vuelve a como estaba.
- **Los colores y las medidas salen de los tokens, no de las pantallas**: `mobile/global.css` se genera desde `packages/ui/tokens.js` con `npm run tokens:css`, y CI falla si quedó desactualizado. Las variables CSS estaban escritas a mano y duplicadas en `:root` y en `.dark`, con el hex de referencia en un comentario al lado, así que un cambio de color había que hacerlo en tres lugares y el comentario podía quedar mintiendo. La lista de colores del `tailwind.config.js` tampoco se escribe más a mano: se arma desde la capa semántica de los tokens. De paso se reemplazaron los hex sueltos de las pantallas (iconos, `tintColor`, los `fill` de las ilustraciones SVG, el degradado del footer) por el token que les corresponde, y los `p-[24px]`, `gap-[16px]`, `rounded-[16px]` y `text-[14px]` por las clases que ya existían (`p-xl`, `gap-lg`, `rounded-lg`, `text-body`). Quedan a propósito los píxeles que son medida de un elemento y no un valor de la escala (`h-[56px]`, `max-w-[350px]`, los esqueletos de carga).
- **Identificadores de la app alineados con la marca**: en `mobile/app.json`, `slug` pasa de `expense-tracker` a `saldai`, `scheme` de `gastos` a `saldai` y el package de Android de `com.crirun.expensestracker` a `com.crirun.saldai`, más el `bundleIdentifier` de iOS que faltaba. El package de Android no se puede cambiar después de publicar en Play Store, así que había que hacerlo antes del primer release. Como el slug de un proyecto de Expo no se puede editar, el proyecto en expo.dev se recreó con el slug `saldai` y el `projectId` apunta al nuevo; no se perdió nada porque todavía no había builds ni keystore.
- **Dependencias de mobile declaradas**: `@supabase/supabase-js` y `@saldai/ui` se usaban sin declararse y funcionaban solo porque npm las subía (hoisting) desde `api`. Un cambio en las dependencias de la API podía romper mobile sin tocar mobile.

### Fixed
- **El teclado tapaba el form de captura**: al tocar un campo el teclado subía por encima del form sin que el form se moviera, y el footer con el menú y el botón de guardar desaparecía de golpe. Eran tres cosas apiladas. Edge-to-edge, obligatorio en Android 16 y ya encendido en `app.json`, dejó de achicar la ventana al abrir el teclado, así que `adjustResize` no acomoda nada y la app tiene que leer el inset del teclado por su cuenta; `captura.tsx` medía la altura del teclado y la descartaba en Android, donde lo único que cambiaba era un padding que hacía *bajar* el form. Además todo colgaba de `keyboardDidShow`, que en Android llega cuando la animación ya terminó, así que el movimiento no podía ser otra cosa que un salto. Y `GradientFooter` hacía `return null`, y un componente desmontado no puede animar su salida. Ahora `react-native-keyboard-controller` expone la altura del teclado como shared value de Reanimated, actualizada en el hilo de UI contra la animación real del sistema: el form y el footer se mueven con la misma curva, en el mismo tramo de tiempo. Tocar fuera de los campos baja el teclado, y la tecla de acción pasa al siguiente campo (monto → descripción → fecha) en vez de cerrarlo. **Necesita un build nativo nuevo**: la librería trae código Kotlin y Swift, no viaja en el bundle de JS.
- **El título de la pantalla de login estaba en blanco**: `Ingresar` (y `Verificar email`) usaba `text-foreground`, el blanco puro, mientras los labels de la misma pantalla y la descripción de cada gasto usan `text-muted-foreground`. Las otras dos pantallas con título del mismo tamaño (`cuenta` y la lista de gastos) ya usaban el gris, así que login era la única excepción. Ahora usa el mismo token; no se agregó ningún color nuevo.
- **El menú principal y varios botones habían perdido sus estilos**: el PR #57 movió componentes a `features/`, pero los globs de `content` en `mobile/tailwind.config.js` seguían apuntando solo a `app/`, `components/` y `lib/`. Tailwind genera únicamente las clases que encuentra en los archivos que escanea, y una carpeta fuera de `content` **no da ningún error**: las clases simplemente no se generan. Faltaban 21 reglas, entre ellas `-mx-xl`, `bottom-0`, `mb-lg`, `mb-xl` y `flex-grow-0` (el posicionamiento del `GradientFooter`, o sea el menú), `pr-4xl`, `px-8`, `mr-lg` y `mr-md` (los paddings laterales de los botones) y `w-4xl`, `w-xxl` y `h-xxl` (el tamaño de los botones circulares). No lo agarró nada: el typecheck no mira strings, los tests no renderizan estilos y `expo export` compila igual. Se agregó `npm run tailwind:content:check`, que falla si un archivo con `className` queda fuera de `content`, y corre en CI.
- **El mensaje de la captura dejaba un temporizador vivo**: después de guardar, el hook programaba un `setTimeout` de 4 segundos para limpiar el mensaje, y no lo cancelaba si la pantalla se iba antes. Quedaba un `setState` pendiente sobre algo ya desmontado. Lo encontraron los tests nuevos, que no terminaban por eso.
- **Mobile mostraba categorías y montos que no existen**: los mocks inventaban "Comida", "Despensa", "Test" y "Mock", que ningún selector ni color conocía, y formateaban el monto como `$15,000.00` en vez de `$15.000`. Ahora se arman desde el catálogo y el formateador del core, así que el modo mock se ve como producción.
- **El selector de método no marcaba nada en el playground**: el estado inicial era `'tc'` en minúscula y los botones comparaban contra `'TC'`. Los dos lados salen ahora de `METODO_DEFAULT`.
- **Listas duplicadas que se podían desincronizar**: los nombres de los meses estaban escritos a mano en `mobile/constants/theme.ts`, el formato de monto estaba repetido en ocho lugares de mobile y los emojis y colores de categoría eran una lista paralela a la de la API. Todo eso sale ahora del core, y los emojis y colores se derivan del catálogo, así que una categoría nueva no puede quedar con keywords en la API pero sin nada que mostrar. El dashboard web mantiene sus propias copias por ahora, porque web está en pausa; se migra cuando se retome.
- **Build de desarrollo pedía instalar `expo-updates`**: los tres perfiles de `mobile/eas.json` declaraban un `channel`, y un channel solo tiene sentido con `expo-updates` instalado, que no lo está. EAS interrumpía cada build para ofrecer instalarlo. Se quitaron los `channel`; vuelven cuando adoptemos actualizaciones OTA.
- **Errores de la API en mobile**: `fetchGastosPorMes` y `fetchGastosAnuales` leían `error` de la respuesta, pero la API siempre responde `errores: string[]`. El detalle se perdía y siempre se mostraba el texto genérico. Ahora se leen todos los mensajes, y los del parser (que vienen varios juntos) se muestran completos.
- **Tipos de mobile en cero**: el cliente de Supabase se exportaba como `any` por el ternario del modo mock, así que todo lo que lo usaba perdía los tipos. Queda anotado como `SupabaseClient`. Además `<Portal>` de `@rn-primitives/portal` requiere la prop `name`, que faltaba en `ConfirmationModal`.
- **Eliminar cuenta en mobile**: si la llamada a `delete_user` fallaba, la app lo registraba con `console.warn`, cerraba sesión y mostraba "Cuenta eliminada correctamente" igual. Ahora el error se muestra y la sesión no se cierra.

## [1.5.6] - 2026-04-12
### Added
- **Mes Contable (Fake Door):** Implementada una nueva pantalla temporal (Empty State) para la sección de Configuración de Mes Contable (`mobile/app/(tabs)/mes-contable.tsx`). Al igual que Categorías, incluye una ilustración SVG adaptada a móviles y un botón de *Call to Action* (`Avísenme`) alineado a los Tokens visuales.
- **Categorías (Fake Door):** Implementada una nueva pantalla temporal (Empty State) para la sección de Configuración de Categorías (`mobile/app/(tabs)/categorias.tsx`). Incluye una ilustración SVG personalizada y un botón de *Call to Action* (`Avísenme`) alineado a los Tokens visuales del monorepo.
- **Modales Universales:** Componente `ConfirmationModal` (`mobile/components/ui/ConfirmationModal.tsx`) diseñado como un overlay translúcido para abstraer flujos de advertencia severos. Implementa inyección de componentes SVG (Phosphor) y soporte para botones destructivos.
- **Simulación Mocks de Borrado:** Se incluyó el interceptor de latencias falsas en `configuraciones.tsx` para probar de forma segura la UI (Activity Indicators y Toasts) de cierre de sesión y borrado de cuenta sin tocar Supabase.

### Changed
- **Botón FAB (Captura):** El botón de guardado flotante en el layout de `captura.tsx` (dentro de `GradientFooter`) cambió de ser un círculo rígido (`w-4xl`) a tener una forma de pastilla alargada (`px-8 py-3`), respetando las proporciones de toque del diseño original para acciones principales.
- **Notificaciones de Gasto:** Se simplificó la copia del componente `<Notification>` (`mobile/components/ui/Notification.tsx`). Al crear un gasto, el toast ahora omite la descripción larga y solo muestra "Agregado $MONTO" para evitar el truncamiento de texto excesivo en la pantalla.
- **Flujos Destructivos:** Las opciones "Cerrar sesión" y "Eliminar cuenta" en el menú de configuraciones ya no utilizan el `Alert.alert` genérico nativo de OS. Ahora levantan el modal de confirmación tematizado, asegurando una estética continua con los Design Tokens (`bg-card`, `bg-muted`).
- **Navegación Histórica:** Se incrementó el área presible (`hit slop` mediante padding nativo) del selector de mes (`index.tsx`) para mejorar la precisión del toque al incluir tanto el texto del mes como el icono de `CaretRight` dentro del perímetro de contacto dinámico.
- **UI Playground Mocker**: Extraída la configuración local (`mockFeedConfig`) desde el módulo `services/api.ts` a un archivo completamente nuevo `services/mockConfig.ts` para quebrar el Require Cycle fatal entre el API y el Contexto de Autenticación de Supabase.
- **Iconografía Uniforme**: Substitución de todas las importaciones e instancias renderizadas de `<Feather>` por sus equivalentes nativos de `<Phosphor>` (`<Plus>`, `<Calendar>`, `<CaretDown>`) en los selectores de captura de form.
- **Tipado Base de Monorepo**: Se reubicaron de manera forzada los módulos `typescript` y `@types/react` al bloque interno `devDependencies` del Mobile para silenciar errores del LSP en VSCode/Cursor (`TS2786`).

### Removed
- **Vectores Legacy**: Eliminada permanentemente la librería `@expo/vector-icons` del bundle móvil.
- **Dependencias Huérfanas**: Limpieza global de módulos inactivos (`@boxicons/*`, `react-native-worklets` y navegadores no-tabulares de Reanimated 2/3).

### Fixed
- **Estilos Visuales (Android/Expo):** Se eliminó el plugin legacy `nativewind/babel` de la configuración de Babel (`mobile/babel.config.js`) para solucionar conflictos de inyección y renderizado con Metro en NativeWind v4.

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

### Changed
- **Arquitectura de Login Condicional**: Se refactorizó drásticamente el flujo de inicio de sesión inicial. La vista `verify.tsx` fue fusionada dentro de `login.tsx` utilizando un nuevo estado `isVerifying`. Al solicitar un código OTP, en vez de navegar a otra ruta de React Navigation, la UI transiciona transparentemente sobre el mismo Canvas, bloqueando el campo del email y montando el nuevo componente `<OtpInput />`. Esto alinea funcionalmente el inicio de sesión con la lógica ya probada en la actualización de Cuenta.
- **Limpieza de Código y Legibilidad**: Se insertaron bloques de comentarios semánticos (`// --- STATES ---`, `// --- EFFECTS ---`, `// --- HANDLERS ---`, `// --- RENDER ---`) tanto en `login.tsx` como en `cuenta.tsx`, estructurando los componentes y evitando la desorganización de hooks típicos de componentes grandes de React.

### Removed
- **Depreciación de Verify Screen**: Se eliminó del file system el archivo `mobile/app/(auth)/verify.tsx` y su correspondiente mapeo en el archivo de layout `_layout.tsx`, ya que ahora su responsabilidad yace condicionalmente dentro de `login.tsx`.

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
- **Shared Tokens:** Migrated emoji token mappings (`EMOJIS_CAT`) to use the monorepo shared package `@saldai/ui/tokens`.

### Removed
- **Auth Callback Screen:** Removed `callback.tsx` as auth is verified natively in the UI.
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
- **Componente OTP Reutilizable**: Se extrajo la lógica de renderizado de PIN visual (con el cursor intermitente de 500ms y los puntos reactivos) a un nuevo componente compartido `<OtpInput />` (`mobile/components/ui/OtpInput.tsx`). Esto asegura un comportamiento uniforme de los inputs de verificación a través de toda la aplicación.
