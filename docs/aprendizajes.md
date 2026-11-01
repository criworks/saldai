# Aprendizajes de Saldai

Las veces que algo de este stack no se comportó como se esperaba, escritas para
que la próxima vez se reconozca antes.

## Cuándo se escribe acá

**Solo cuando algo sorprendió.** Dos casos:

- Algo estaba roto y **no daba ningún error**: CI verde, typecheck verde, nadie
  se enteró hasta que una persona lo vio.
- La causa real **no era la obvia**: el arreglo estaba en otro lado del que
  parecía.

No va una entrada por PR. Un cambio que salió como estaba planeado no deja
aprendizaje, deja una entrada de `CHANGELOG.md`. Si al escribir la entrada el
punto "por qué no se notaba" queda vacío, probablemente no sorprendió nada y no
corresponde escribirla.

## Cómo se escribe

Cinco puntos, cortos, en este orden:

1. **Síntoma** — qué se vio desde afuera, en los términos en los que lo vio
   quien lo reportó.
2. **Causa** — qué estaba pasando de verdad.
3. **Por qué no se notaba** — qué comprobación debería haberlo agarrado y no lo
   agarró.
4. **Arreglo** — qué se cambió.
5. **Regla** — qué queda para la próxima.

**Nada de logs de comandos ni listas de archivos tocados.** Eso es lo que hundió
al `REPORT.md` que esto reemplaza: terminó siendo una transcripción de sesiones
en la que el aprendizaje quedaba sepultado, y describiendo una estructura de
carpetas que ya no existe.

Lo escribe el hilo que resolvió el problema, **en el mismo PR del arreglo**.
Las entradas nuevas van arriba.

## Qué va acá y qué no

Acá van los aprendizajes **de este producto y este stack**: Expo, NativeWind,
Express, Supabase, el monorepo, los tokens. Cosas que le sirven a quien vuelva a
tocar Saldai.

Los aprendizajes **portables** —los que valen para cualquier proyecto— van al
documento vivo de la auditoría, no acá:
https://claude.ai/artifact/6H1LTgBbkuVTwSTDFuUR5G

---

## Un check obligatorio tiene que ser un job, no un paso

PR #72 · noviembre 2026

- **Síntoma**: todos los PR aparecían como "bloqueados" en GitHub aunque CI
  estuviera verde, y había que mergear pasando por encima del aviso. Pasó en el
  #70, el #71 y el #72.
- **Causa**: el ruleset de `development` y `main` exige el check **por nombre**,
  "Formato de los CHANGELOG", y en `ci.yml` eso era un *paso* dentro del job
  "Tests, lint y tipos". Un paso no reporta un check con su nombre: solo el job
  lo hace. El check quedaba exigido y nunca llegaba, así que la condición no se
  podía cumplir nunca.
- **Por qué no se notaba**: CI estaba genuinamente verde y el paso corría de
  verdad, así que el aviso de GitHub parecía un trámite de revisión. Mirar los
  checks no alcanzaba; había que mirar el `mergeable_state` del PR, que decía
  `blocked`.
- **Arreglo**: el check pasó a ser un job propio con el nombre exacto que pide
  el ruleset. No instala dependencias, porque
  `scripts/verificar-changelogs.mjs` solo usa módulos de Node.
- **Regla**: un check que el ruleset exige tiene que existir como job con ese
  nombre. Al agregar uno obligatorio, la comprobación no es que CI esté verde:
  es que un PR vuelva a `mergeable_state: clean`. Es la misma clase de falla que
  los globs de Tailwind — una configuración que enumera nombres y deja de
  encontrarlos cuando el otro lado se mueve.

## El teclado tapaba el formulario porque edge-to-edge desactiva el truco de Android

PR #65 · noviembre 2026

- **Síntoma**: en la pantalla de captura el teclado tapaba el formulario, y el
  menú inferior desaparecía de golpe en vez de salir con la animación.
- **Causa**: tres cosas apiladas, y arreglar una sola deja el bug a medias.
  Primero, `edgeToEdgeEnabled` (obligatorio en SDK 54 sobre Android 16, sin
  opt-out) hace que la ventana **ya no se achique** al abrirse el teclado: se
  extiende por detrás y la app tiene que consumir el inset del IME por su
  cuenta, así que `adjustResize` dejó de hacer nada. Segundo, React Native solo
  emite `keyboardWillShow/Hide` en iOS: en Android llega `keyboardDidShow`,
  cuando la animación **ya terminó**, así que cualquier layout movido desde
  estado de React por ese evento es un salto y no una transición. Tercero, el
  menú hacía `return null` con el teclado arriba, y un componente desmontado no
  puede animar su salida — y al ser el `tabBar` del navegador, el salto se veía
  en toda pantalla con un campo.
- **Por qué no se notaba**: el código medía la altura del teclado y **la
  descartaba en Android**, así que parecía estar manejado. Nada de lo que corre
  en CI mira esto: el typecheck no evalúa layout, los tests no miden posiciones
  y `expo export` compila igual. Solo se ve abriendo el teclado en un teléfono
  de verdad; el teclado del emulador viene apagado por defecto.
- **Arreglo**: `react-native-keyboard-controller`, que sigue el
  `WindowInsetsAnimation` de Android frame a frame y expone un shared value de
  Reanimated. El padding del formulario y el `translateY` del menú se animan
  contra ese valor, no contra estado de React. Descartado antes:
  `KeyboardAvoidingView` de RN (pensado para iOS, poco fiable en Android
  edge-to-edge) y `useAnimatedKeyboard` de Reanimated, que además de estar
  **deprecado en Reanimated 4** expande el root view y toma los insets, justo lo
  que choca con edge-to-edge.
- **Regla**: cuando una plataforma cambia de modelo de ventana, los trucos que
  dependían del modelo viejo **no fallan, dejan de aplicarse**. Y una
  transición de teclado en Android no se puede manejar desde estado de React:
  el evento que lo dispara llega tarde por definición.

## Un `.env` gitignoreado sobrevive a la mudanza que debería haberlo cambiado

Noviembre 2026

- **Síntoma**: la app mostraba "Error en la respuesta del servidor al obtener
  gastos" al abrir la lista, con la API nueva funcionando y verificada.
- **Causa**: `mobile/.env` seguía con la URL del servicio viejo de Render, que
  estaba suspendido. Al estar gitignoreado, **ningún cambio del repo lo pudo
  tocar**: era el único lugar que quedó apuntando al servicio apagado, y un
  `grep` de la URL vieja sobre todo el árbol daba exactamente esa línea.
- **Por qué no se notaba**: el mensaje que se veía era el **texto genérico de
  fallback**, no un error de la API. Un servicio suspendido de Render contesta
  su propia página HTML, así que `res.json()` falla y el helper que lee
  `errores[]` cae al texto por defecto. El síntoma apunta al backend justo
  cuando el backend no es el que contestó.
- **Arreglo**: la URL se corrigió a mano en la máquina donde vive el archivo, y
  Metro se reinició limpiando caché, porque las `EXPO_PUBLIC_*` quedan horneadas
  en el bundle y guardar el archivo no alcanza (de ahí el script
  `npm run start:clear`).
- **Regla**: al cambiar un dominio o un entorno, inventariar primero los
  archivos **que git no versiona** — son los que el cambio no puede alcanzar y
  los últimos en los que se busca. Y si el mensaje de error que se ve es
  exactamente el fallback genérico, lo que contestó no fue la API: el problema
  es de red, de URL o de infraestructura, no del backend.

## Los globs de `content` de Tailwind fallan callados

PR #60 · octubre 2026

- **Síntoma**: el menú principal y varios botones de la app aparecieron sin sus
  estilos, después del PR #57.
- **Causa**: el #57 movió componentes a `features/`, y los globs de `content` en
  `mobile/tailwind.config.js` seguían apuntando solo a `app/`, `components/` y
  `lib/`. Tailwind genera únicamente las clases que encuentra en los archivos
  que escanea. Faltaban 21 reglas, entre ellas el posicionamiento del
  `GradientFooter` (el menú) y los paddings laterales de los botones.
- **Por qué no se notaba**: una carpeta fuera de `content` no produce ningún
  error. El typecheck no mira strings, los tests no renderizan estilos y
  `expo export` compila igual. CI quedó verde.
- **Arreglo**: `npm run tailwind:content:check`
  (`mobile/scripts/verificar-content-tailwind.mjs`), que falla si un archivo con
  `className` queda fuera de `content`, y corre en CI.
- **Regla**: toda configuración que **enumera rutas** (globs de Tailwind,
  `workspaces`, `include` de tsconfig, paths de un deploy) se rompe en silencio
  cuando los archivos se mueven. Mover carpetas obliga a inventariar esas
  configuraciones, y cada una debería tener un check que la ate al árbol real.

## Cambiar cómo se identifica al usuario rompió todas las queries

PR #46 (el que lo introdujo) · abril 2026

- **Síntoma**: no se podía guardar ni leer ningún gasto. La app respondía "Error
  al leer de base de datos". La última fila de `gastos` quedó con fecha del 11 de
  abril.
- **Causa**: el middleware de auth pasó de validar el JWT a mano a usar
  `supabase.auth.getUser(token)`, que devuelve el id en `user.id` y **no tiene
  campo `sub`** (`sub` es el claim del JWT, que era lo que se usaba antes). Las
  tres queries autenticadas de `server.js` seguían leyendo `req.user.sub`,
  salían con el string `"undefined"` como `user_id` y Postgres las rechazaba con
  `invalid input syntax for type uuid`.
- **Por qué no se notaba**: el cambio del middleware se hizo y se registró como
  una mejora de dependencias —"eliminada la dependencia arcaica de validación de
  JWT"— sin revisar quién consumía la forma vieja de `req.user`. No había tests
  de las rutas autenticadas, y el error llegaba al cliente como un mensaje
  genérico de base de datos que no apuntaba a la causa.
- **Arreglo**: el id se resuelve una sola vez en el middleware y se expone como
  `req.userId`; si falta, el request corta con 401 antes de llegar a la query.
- **Regla**: cambiar **la forma de un objeto compartido** (`req.user`, una
  respuesta de la API, un token) obliga a buscar todos sus lectores, no solo a
  que el productor nuevo funcione. `grep` del campo viejo es parte del cambio.
  Y un error de infraestructura que llega al usuario como mensaje genérico es un
  error que nadie va a poder diagnosticar.

## Express 4 no atrapa promesas rechazadas, y la librería sola no alcanza

Abril 2026 (`express-async-errors`), auditado en octubre 2026

- **Síntoma**: ninguno visible. Un `throw` inesperado en una ruta `async`
  —por ejemplo un fallo al insertar en Postgres— dejaba el request colgado o
  devolvía un cuerpo inesperado.
- **Causa**: dos capas. Express 4 (a diferencia de la 5) no intercepta las
  promesas rechazadas dentro de un handler, así que hay que requerir
  `express-async-errors`. Pero eso solo **reenvía** el error al manejador de
  errores: si no hay ninguno detrás, el error cae en el handler por defecto de
  Express, que responde **con el stack trace en el cuerpo** cuando `NODE_ENV` no
  es `production`. La librería estaba instalada y requerida; el manejador no
  existía.
- **Por qué no se notaba**: lo que veía el cliente ante una excepción dependía de
  una variable de entorno en vez de ser una decisión, y en desarrollo "se veía
  bien" porque el stack trace era informativo. Nunca se probó una ruta que
  lanzara.
- **Arreglo**: manejador de errores propio al final de la app. El cliente recibe
  siempre un 500 genérico con la forma `{ ok, errores }`, el detalle va al log, y
  un cuerpo demasiado grande o un JSON roto responden 413 y 400. Se agregó
  también el 404, que antes devolvía el HTML del handler por defecto.
- **Regla**: instalar la librería no es implementar la funcionalidad. Un
  mecanismo de manejo de errores no está puesto hasta que hay un caso que lo
  ejercita y muestra qué recibe el cliente.

## NativeWind v4 no lleva el plugin de Babel de la v2

Abril 2026

- **Síntoma**: los estilos de la app dejaron de aplicarse en Android al
  reiniciar el bundler.
- **Causa**: `mobile/babel.config.js` seguía declarando `'nativewind/babel'`.
  En NativeWind v4 la inyección de estilos pasa por Metro (`metro.config.js`) y
  el preset de Expo; mantener el plugin viejo genera un conflicto de compilación.
- **Por qué no se notaba**: la configuración viene de la v2 y seguía siendo
  válida sintácticamente, así que nada la marcaba como obsoleta. El síntoma
  aparece al reiniciar el bundler, no al guardar un archivo.
- **Arreglo**: se eliminó la entrada del array de plugins.
- **Regla**: al subir de major una librería que se integra con el build
  (NativeWind, Tailwind, Expo, Metro), la configuración **vieja que sigue
  presente** es el primer sospechoso. Las guías de migración listan lo que hay
  que agregar; lo que hay que sacar queda implícito.

## Los colores van en HSL, no en hex, por los componentes tipo Shadcn

Abril 2026

- **Síntoma**: componentes de React Native Reusables que no tomaban los colores
  del tema, y destellos blancos al abrir pantallas en una app que es toda oscura.
- **Causa**: los componentes de ese linaje (Shadcn / RNR) leen variables CSS con
  los canales HSL separados y los recomponen por su cuenta. Un `#HEX` crudo en la
  variable no lo pueden interpretar.
- **Por qué no se notaba**: el hex funcionaba perfecto en todo lo escrito a mano
  con clases de Tailwind. El problema aparecía solo en los componentes que
  dependen del parseo interno de las variables.
- **Arreglo**: `mobile/global.css` define los colores como HSL, generado desde
  `packages/ui/tokens.js`. El `:root` arranca en la escala oscura, lo que además
  evita el flash blanco.
- **Regla**: el formato de un token no es cosmético cuando hay un consumidor que
  lo parsea. Antes de elegir cómo escribir un valor compartido, mirar qué espera
  quien lo va a leer.

## Los paddings de Figma se mapean a tokens, no se copian textuales

Abril 2026

- **Síntoma**: valores como `p-[8px]` y `gap-[24px]` repartidos por las
  pantallas, sacados directo del canvas, y una UI que no escalaba parejo al
  cambiar un espaciado.
- **Causa**: extraer medidas de Figma da números absolutos. Pegarlos como clases
  arbitrarias deja el valor fuera de la escala, así que deja de responder a los
  tokens.
- **Por qué no se notaba**: cada pantalla se veía bien por separado y 1:1 con su
  frame. La inconsistencia solo aparece al comparar pantallas entre sí o al
  cambiar la escala.
- **Arreglo**: toda medida extraída se mapea al token más cercano de
  `packages/ui/tokens.js` (`p-sm`, `gap-xl`). Lo mismo con los colores:
  `bg-background` y no `bg-[#111217]`.
- **Regla**: el diseño se traduce, no se transcribe. Si una medida de Figma no
  tiene token, la decisión es agregar el token o usar el vecino, nunca escribir
  el número en la pantalla. Corolario de la regla del repo: un fix visual va al
  componente o al token.
