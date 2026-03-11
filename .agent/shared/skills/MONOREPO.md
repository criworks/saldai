# MONOREPO.md — Estructura del proyecto

## Visión general

Monorepo con tres aplicaciones y un paquete compartido. Todo en un solo repositorio Git.

```
expenses-tracker/
├── api/                        ← Backend Node.js + Express
├── web/                        ← Frontend Next.js (en desarrollo)
├── mobile/                     ← App React Native + Expo
├── packages/
│   └── ui/
│       ├── tokens.js           ← Fuente única de verdad de diseño
│       └── package.json        ← name: @expenses/ui
├── docs/
│   ├── skills/                 ← Documentación técnica por dominio
│   ├── CLAUDE.md
│   └── GEMINI.md
├── package.json                ← Raíz con workspaces
└── .gitignore
```

## Workspaces

El `package.json` raíz declara los workspaces:

```json
{
  "name": "expenses-tracker",
  "private": true,
  "workspaces": ["packages/*", "web", "mobile", "api"]
}
```

Esto linkea `@expenses/ui` como paquete local disponible para todos los workspaces.

## Scripts desde la raíz

```bash
npm run api      # levanta el servidor Express en api/
npm run web      # levanta Next.js en web/
npm run dev      # levanta api + web juntos
npm run cli      # abre el CLI interactivo del parser
npm test         # corre la suite de tests del parser
```

## Scripts por carpeta

```bash
# API
cd api && npm start          # producción
cd api && npm run dev        # desarrollo con --watch
cd api && npm run cli        # CLI interactivo
cd api && npm test           # suite de tests

# Mobile
cd mobile && npx expo start  # Expo Go para desarrollo
cd mobile && eas build --platform android --profile preview  # APK distribuible
```

## Reglas del monorepo

- **Nunca commitear `.env`** — vive en cada subcarpeta, nunca en la raíz
- **`.env.example`** existe en la raíz como referencia de variables requeridas
- **`packages/ui/tokens.js`** es la fuente única de verdad — no duplicar colores ni constantes en otras carpetas
- **Cada subcarpeta tiene su propio `package.json`** con nombre único en lowercase

## Variables de entorno por capa

| Variable | Dónde | Uso |
|---|---|---|
| `SUPABASE_URL` | `api/.env` + Railway | Conexión a base de datos |
| `SUPABASE_ANON_KEY` | `api/.env` + Railway | Autenticación Supabase |
| `NEXT_PUBLIC_API_URL` | `web/.env.local` + Vercel | URL de la API desde browser |
| `EXPO_PUBLIC_API_URL` | `mobile/.env` | URL de la API desde la app |

## Deploy

| Capa | Servicio | Trigger |
|---|---|---|
| API | Railway | Push a GitHub → redeploy automático |
| Web | Vercel | Push a GitHub → redeploy automático |
| Mobile | EAS Build | Manual → `eas build --platform android` |
