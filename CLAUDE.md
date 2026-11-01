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
`main`, en un solo job: `npm ci`, tests, lint, typecheck y los dos checks de
tokens y de Tailwind. Esos dos últimos están porque ya fallaron callados — un
glob que quedó fuera de la config de Tailwind dejó de generar 21 reglas de
estilo con CI verde.

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
  `development` tiene que resolverse quedando solo líneas `+`.
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

## Antes de abrir un PR

1. `npm test`, `npm run typecheck` y `npm run lint` en verde.
2. Si se tocaron tokens: `npm run tokens:css` y commitear `mobile/global.css`.
3. Si se movieron o agregaron carpetas con clases de Tailwind:
   `npm run tailwind:content:check`.
4. Entrada nueva en `CHANGELOG.md`, agregando.

Que CI esté verde no dice nada de cómo se ve algo: ni el typecheck ni un
`expo export` abren la app. La verificación visual la hace una persona en el
teléfono.
