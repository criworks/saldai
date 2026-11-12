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

## Renombrar una tabla deja rotas las funciones plpgsql, y ninguna lo dice

PR del renombre de `gastos` a `movimientos` · noviembre 2026

- **Síntoma**: nada. El `alter table ... rename` corre sin una sola advertencia,
  el resto del esquema sigue funcionando y la base queda aparentemente sana.
- **Causa**: Postgres guarda por OID lo que apunta a una tabla —las vistas, las
  foreign keys, los índices, el cuerpo de una función `language sql`— y todo eso
  sigue a la tabla sola al renombrarla. El cuerpo de una función **plpgsql** no:
  es texto y se vuelve a parsear en cada ejecución, así que `delete_user()` y
  `confirmar_ocurrencia_recurrente()` quedaron diciendo `public.gastos`, una
  relación que ya no existía.
- **Por qué no se notaba**: la migración sale en verde y las dos funciones solo
  fallan **cuando alguien las llama**, o sea al borrar una cuenta o al confirmar
  una propuesta. CI no corre el SQL, y ningún test de la API las ejecuta contra
  una base de verdad: el error aparece recién en producción, en la cara del
  usuario y con un mensaje que no menciona el renombre.
- **Arreglo**: la misma migración reescribe todas las funciones plpgsql que
  nombran la tabla, aunque su lógica no cambie, y se verificó aplicando las doce
  migraciones contra un Postgres 16 local con un stub de `auth` y llamando a
  cada función.
- **Regla**: después de renombrar algo en la base, buscar su nombre en el texto
  de las funciones (`pg_get_functiondef`), no confiar en que la migración haya
  corrido limpia. Y lo mismo vale para la otra punta del rename: el nombre viejo
  sigue vivo en los clientes que ya están instalados, así que mientras alguno le
  hable hay que dejarle una vista y una ruta por donde entrar.

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

## Una fecha mal guardada no se nota si no cruza el límite del mes

**Síntoma.** Ninguno. Nadie lo reportó. Salió de re-correr el parser sobre los
73 `input_original` de producción y comparar el resultado con lo guardado: una
fila, "arriendo abril" de 525.457, tenía `fecha` 2026-04-03 cuando su input
decía "Ayer" y debía ser 04-02.

**Causa.** Se creó el 2026-04-04T02:48Z. En Chile eran todavía las 22:48 del
día 3, así que "ayer" era el 2; el "hoy" de referencia se resolvió con el día
**UTC** y quedó corrido un día. Render corre en UTC y el parser usaba la fecha
del servidor. `hoyCivil(zona)` entró recién el 2026-10-29 (`5516fd4`): las filas
creadas después en esa misma ventana (00:00–04:00 UTC) están correctas.

**Por qué no se notaba.** Mover la fila del 3 al 2 de abril **no cambia ningún
total mensual**, porque sigue cayendo en abril. La app solo muestra listas y
sumas por mes, así que no hay una sola vista donde el error aparezca. Los tests
del parser pasan `hoy` fijo, que es justamente lo que evita el bug, y ninguno
cubría el caso de que el `hoy` real viniera de otra zona.

**Arreglo.** `registrarMovimiento()` en `@saldai/core` resuelve el "hoy" una sola
vez y devuelve el contexto que usó; la API y mobile pasan por ahí, mobile manda
la zona del dispositivo, y la fila guarda `zona` y `hoy_resuelto`. Con eso la
fecha se puede volver a derivar desde el texto original en vez de inferirla de
`creado_en`.

**Regla.** Un error de un día solo se ve si cruza el límite del periodo que la
vista agrupa, así que las sumas por mes no sirven para detectarlo. Lo que lo
detecta es **re-derivar el dato desde su origen y comparar**, y eso solo es
posible si el origen guarda el contexto con el que se decidió: una fecha
relativa sin la zona y el día de referencia no es reproducible.

---

## `timeZone: undefined` no falla: significa "la del sistema"

PR de la UI de preferencias · noviembre 2026

- **Síntoma**: ninguno todavía. Lo agarró un test del catálogo de zonas antes
  de que el selector llegara a una pantalla.
- **Causa**: `desplazamientoDeZona()` validaba la zona dejando que
  `new Intl.DateTimeFormat('en-US', { timeZone: zona })` tirara, que es la forma
  en que `esZonaValida()` valida un nombre IANA y funciona bien para `''` o para
  `'America/Narnia'`. Pero con `undefined` no tira: la opción ausente significa
  "la zona del sistema". Así que una zona que no venía devolvía el
  desplazamiento del aparato, presentado como si fuera el de la zona pedida.
- **Por qué no se notaba**: el valor devuelto es un número perfectamente
  válido, y en el contenedor de CI el sistema está en UTC, así que `0`. Cero es
  además un desplazamiento real: en el selector, una zona que el motor no
  conoce habría aparecido agrupada bajo `(UTC+00:00)` en vez de quedar fuera.
  Nada da error en ninguna de las dos puntas.
- **Arreglo**: un guardia explícito —si no es un string con contenido,
  `null`— antes de construir el formateador, y un test que pasa `undefined`.
- **Regla**: una opción de `Intl` que falta no es una opción inválida; es el
  default. Validar "tira o no tira" solo sirve para los valores presentes, así
  que el caso ausente se comprueba aparte. Y cuando una función devuelve un
  número, "no sé" no puede ser un número que también signifique algo.

---

## Una feature mergeada a `development` no existe para el teléfono

PR de los switches de preferencias · noviembre 2026

- **Síntoma**: en el teléfono, con el dev build y `npm start`, los switches de
  configuraciones no se prendían, la pantalla de zona horaria mostraba "No se
  pudo leer tu zona horaria" y no se podía elegir ninguna zona. Tres síntomas
  en dos pantallas distintas.
- **Causa**: una sola, y afuera de la app. `GET` y `PATCH
  /perfil/preferencias` estaban en `development`, y **Render despliega la API
  solo desde `main`**. El dev build toma `EXPO_PUBLIC_API_URL` del `.env` de la
  máquina, que apunta al servicio de Render, así que la app le pedía las
  preferencias a una API que todavía no tiene esas rutas: 404, la lectura tira,
  y el hook cae a sus defaults, que son todo apagado y zona nula. Los tres
  síntomas son ese mismo default visto desde tres lugares.
- **Por qué no se notaba**: nada de esto puede fallar antes. CI corre los tests
  de los tres paquetes contra el código del PR, donde la ruta existe; el
  typecheck no sabe qué contesta un servidor; y el dev build sirve el JavaScript
  más nuevo desde el Metro de la máquina, lo que hace parecer que **todo** es
  nuevo. La app estaba al día y la API no, que es justamente lo que la
  verificación visual no distingue: el aviso de error decía "no se pudo leer",
  no "esa ruta no existe".
- **Arreglo**: ninguno en el código de la app. Para revisar antes del release,
  `EXPO_PUBLIC_API_URL` apunta a la API corriendo en la máquina (`npm run api`,
  puerto 3000) en vez de a Render. Lo que sí se arregló es que la pantalla ya no
  marca "Automática" como elegida cuando la lectura falló: mostrar una elección
  que no se pudo leer es afirmar algo que no se sabe.
- **Regla**: una feature que cruza la app y la API no se puede verificar en el
  teléfono hasta que la API esté en `main`, y el dev build no lo delata porque
  el JavaScript sí viaja. Antes de pedir una revisión visual de algo que habla
  con la API, decir contra qué API va a hablar. Y un hook que cae a defaults
  cuando falla la lectura tiene que distinguir "apagado" de "no sé": el default
  sirve para no mostrar basura, no para afirmar lo que el usuario configuró.

---

## Un icono `regular` de phosphor no se pinta con `className`

PR de los switches de preferencias · noviembre 2026

- **Síntoma**: la flecha de volver del footer salía negra sobre el fondo
  oscuro, o sea invisible, mientras los otros tres iconos de la misma fila se
  veían bien.
- **Causa**: los otros son `weight="fill"`, que pinta el cuerpo del glifo, y
  ahí NativeWind les llega por el color del texto. La flecha era
  `weight="regular"`, que en phosphor es un trazo con `fill="none"`: la clase
  `text-muted-foreground` no tiene por dónde pintarla.
- **Por qué no se notaba**: la clase es la misma que usan los iconos que sí
  funcionan, así que copiarla parece lo correcto. No hay error de tipos ni de
  estilo, y un icono negro sobre fondo oscuro no se ve como un icono mal
  pintado: se ve como un icono que no está.
- **Arreglo**: el color va por el prop `color={colors.textMuted}`, que es lo que
  ya hacen `MenuItem` y los modales, y la flecha pasa a `weight="bold"` para
  pesar como los rellenos de al lado.
- **Regla**: en phosphor, el color por `className` solo es confiable con
  `weight="fill"`. Para cualquier otro peso va por prop, desde los tokens. Es la
  misma clase de falla que los globs de Tailwind: algo que parece configurado
  igual que lo de al lado y no lo está.
