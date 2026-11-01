# CLAUDE.md — Saldai (monorepo)

Qué hay en este repo y cómo se trabaja. Describe lo que se verifica leyendo el
código: si algo de acá no coincide con el código, el archivo está mal y
corregirlo es parte del cambio.

`mobile/CLAUDE.md` tiene lo propio de la app; esto es lo transversal.

---

## Qué es

Registrar un gasto escribiéndolo en lenguaje casi natural, en una línea:

```
monto, item, categoría, fecha, método
45000, uber, transporte, ayer, ef
```

Delimitadores: `, | - /`. Categoría y fecha son opcionales. Método por defecto
TC. El parser que lo entiende es `packages/core/parser.js`.

---

## Workspaces

npm workspaces, Node 22 (`.node-version`, y `engines` en la raíz y en `api/`).
Un solo lockfile, el de la raíz: `*/package-lock.json` está en `.gitignore` a
propósito, porque `npm ci` de CI y de los deploys sale del de arriba.

| Workspace | Qué es | Dónde corre |
|-----------|--------|-------------|
| `packages/core` (`@saldai/core`) | El dominio: categorías, métodos, montos, fechas y el parser | En todos |
| `packages/ui` (`@saldai/ui`) | Tokens de diseño; le pone color y emoji a las categorías del core | En todos |
| `api` | Express + Supabase (Postgres) | Render |
| `mobile` | Expo / React Native | EAS / el teléfono |
| `web` | Next.js | Vercel |

### `packages/core`

Sin framework, sin red y **sin `process.env`**: por eso puede correr dentro del
bundle de mobile. Lo que depende del entorno entra como argumento — la zona
horaria se le pasa, no la lee (`api/src/config.js` la resuelve del lado de la
API). CommonJS, con submódulos importables suelto
(`require('@saldai/core/parser')`) y los tipos del contrato de la API en
`index.d.ts`. Tests con `node --test`.

Si una regla significa lo mismo en la API y en la app, va acá y no duplicada en
las dos.

### `packages/ui`

`tokens.js` es la fuente de verdad de colores, tipografía, spacing, radios y
medidas, más una capa `semantic` con los nombres que usa la UI (`card`,
`muted-foreground`, `border-active`).

De ahí salen, generados, dos archivos que **nunca se editan a mano**:

- `mobile/global.css` → `npm run tokens:css` (lo verifica `tokens:css:check`)
- las clases de `mobile/tailwind.config.js`, que lee los tokens directo

El catálogo de categorías no vive acá: está en `@saldai/core` y `packages/ui`
solo le asigna color y emoji, así una categoría nueva no puede quedar a medias.

### `api`

`server.js` solo carga la config y abre el puerto; la app se arma en
`src/app.js`, que es lo que permite montarla en un test con supertest sin
levantar un proceso. Rutas en `src/rutas/`, consultas a Supabase en
`src/gastos/repositorio.js`, validación de parámetros como funciones puras en
`src/gastos/validacion.js`.

Endpoints:

| Ruta | Sesión |
|------|--------|
| `POST /gastos/parsear` | no |
| `POST /gastos` | sí |
| `GET /gastos?mes=&anio=` | sí |
| `GET /gastos/anuales?anio=` | sí |
| `GET /health` | no (keep-alive de Render) |
| `GET /health/db` | no |

Las respuestas son `{ ok, errores: string[], ... }`. El detalle del error va en
`errores` (plural); `error` en singular aparece solo en los 401. Un cliente que
lee `error` se queda sin el mensaje: ya pasó.

Helmet, `express-rate-limit` con cupos por ruta, `trust proxy` (sin eso `req.ip`
es la del proxy de Render y todos comparten cupo), cuerpo limitado a 10kb, y
Sentry opcional — sin `SENTRY_DSN` la API arranca igual y no manda nada.

### `web`

Next.js en Vercel. **El trabajo está en pausa**: no tiene auth y no se toca
salvo pedido explícito. El único check que corre sobre ella es el lint.

### Migraciones

`supabase/migrations/`, con el Supabase CLI. Las aditivas son seguras siempre;
las que no lo son van después de que el release esté en producción.

---

## Comandos (desde la raíz)

```
npm install
npm test                       # tests del core, de la API y de mobile
npm run lint                   # eslint de web
npm run typecheck              # tsc de mobile
npm run tokens:css             # regenera mobile/global.css desde los tokens
npm run tokens:css:check       # falla si quedó desincronizado
npm run tailwind:content:check # falla si Tailwind dejó de escanear una carpeta
npm run changelog:check        # falla si una entrada nueva de CHANGELOG rompe el formato

npm run api                    # API en watch
npm run web
npm run cli                    # parser interactivo en la terminal
```

Mobile se levanta desde su carpeta: `cd mobile && npm start`.

---

## Ramas, CI y deploy

| Rama | Qué despliega |
|------|---------------|
| `development` | nada; es la rama de integración |
| `main` | producción: Render despliega la API solo desde acá |

El trabajo va en PRs hacia `development`. Un release es un PR aparte de
`development` hacia `main`. Antes de decir que algo está en producción hay que
confirmar que está en `main` **y** que el deploy terminó: estar mergeado a
`development` no es estar liberado.

CI (`.github/workflows/ci.yml`) corre en los PR y los push a `development` y a
`main`, en un solo job: `npm ci`, tests, lint, typecheck y los checks de tokens,
de Tailwind y del formato de los CHANGELOG. Los de tokens y Tailwind están
porque ya fallaron callados — un glob que quedó fuera de la config de Tailwind
dejó de generar 21 reglas de estilo con CI verde.

Un check nuevo no es obligatorio solo por existir: hay que agregarlo al ruleset
de la rama desde la interfaz de GitHub.

---

## Convenciones del repo

- **Español** en nombres de archivos, funciones, variables y comentarios del
  código nuevo. Hay código viejo en inglés; no se renombra de paso.
- **Los comentarios explican por qué**, no qué hace la línea. El estilo del
  repo es dejar escrito el problema que el código evita, para que nadie lo
  "simplifique" de vuelta.
- **El `CHANGELOG.md` solo se agrega**: nunca se modifica ni se borra una
  entrada existente, ni se reescriben fechas. Un conflicto contra
  `development` tiene que resolverse quedando solo líneas `+`. El formato está
  más abajo, en "Changelogs".
- **Un fix visual va al componente o al token**, no a la pantalla. Si aplica a
  más de una pantalla, va al componente compartido o a `packages/ui/tokens.js`;
  si aplica a una sola, se arregla ahí pero consumiendo un token que ya existe,
  nunca un valor hardcodeado. No se inventa una abstracción nueva para un solo
  caso de uso.
- **Nada de URLs de sesión** en commits ni en descripciones de PR.
- **Archivos generados no se editan a mano**: hoy, `mobile/global.css`.
- **El lockfile tampoco**: para resolver un conflicto, tomar el de
  `origin/development` y correr
  `npm install --package-lock-only --ignore-scripts` con los `package.json` ya
  mergeados.

---

## Changelogs

Uno por salida. Un cambio va al de su salida y nada más: duplicarlo hace que
los dos archivos dejen de ser confiables.

| Archivo | Qué lleva |
|---------|-----------|
| `mobile/CHANGELOG.md` | Solo mobile. **Es el que alimenta las notas de versión de las stores.** |
| `web/CHANGELOG.md` | Solo web. En pausa, todavía sin versiones. |
| `CHANGELOG.md` (raíz) | Lo transversal: `packages/`, `api`, `supabase/`, CI, tooling, el repo. |

Formato Keep a Changelog, estricto:

```
## [1.6.0] - 2026-04-02
### Added
- ...

### Changed
- ...
```

El encabezado de versión es exactamente `## [x.y.z] - AAAA-MM-DD`. Debajo van
solo `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed` o
`### Security`, **una sola vez cada una**: si una versión ya tiene `### Changed`,
la entrada nueva se suma a esa sección y no se abre otra. Las versiones van de
la más nueva a la más vieja, y lo que no se liberó todavía va arriba de todo en
`## [Unreleased]`.

Lo verifica `npm run changelog:check` en CI
(`scripts/verificar-changelogs.mjs`).

`mobile/CHANGELOG.md` se había escrito meses sin este formato: versiones fuera
de orden, siete secciones repetidas dentro de una misma versión, `\n` literales
y un segundo encabezado en medio del archivo. Se reordenó una vez, en el PR #71
y por pedido explícito, usando las fechas que ya estaban escritas (coinciden con
el historial de git, no se inventó ninguna) y sin reescribir el texto de ninguna
entrada. **Esa fue la excepción, no el precedente**: de ahí en adelante vale la
regla de siempre, una entrada ya escrita no se toca.

---

## Aprendizajes

`docs/aprendizajes.md` guarda las veces que algo de este stack no se comportó
como se esperaba.

Se escribe **solo cuando algo sorprendió**: estaba roto y no daba ningún error,
o la causa real no era la obvia. No va una entrada por PR — un cambio que salió
como estaba planeado deja una entrada de CHANGELOG, no un aprendizaje.

Cinco puntos, cortos: síntoma como lo vio quien lo reportó, causa real, por qué
no se notaba, arreglo, y la regla que queda. **Nada de logs de comandos ni
listas de archivos tocados**: eso es lo que volvió inservible al `REPORT.md` que
este archivo reemplaza.

Lo escribe el hilo que resolvió el problema, en el mismo PR del arreglo.

Ahí van los aprendizajes **de Saldai** (el stack, Expo, NativeWind, Express,
Supabase, los tokens). Los **portables**, los que valen para cualquier
proyecto, van al documento vivo de la auditoría y no al repo.

---

## Antes de abrir un PR

1. `npm test`, `npm run typecheck` y `npm run lint` en verde.
2. Si se tocaron tokens: `npm run tokens:css` y commitear `mobile/global.css`.
3. Si se movieron o agregaron carpetas con clases de Tailwind:
   `npm run tailwind:content:check`.
4. Entrada nueva en el `CHANGELOG.md` que corresponda (ver "Changelogs"),
   agregando, y `npm run changelog:check` en verde.
5. Si algo sorprendió por el camino, entrada en `docs/aprendizajes.md`.

Que CI esté verde no dice nada de cómo se ve algo: ni el typecheck ni un
`expo export` abren la app. La verificación visual la hace una persona en el
teléfono.
