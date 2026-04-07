## Saldai

Herramienta personal para registrar gastos de forma rápida y sin fricción.
La idea es simple: escribir un gasto en lenguaje casi natural, que el sistema lo entienda y lo organice solo. Sin formularios complejos, sin usar Notion ni GSheets ni Excel, sin el dolor de registrar todo un sábado mirando movimientos bancarios.
El foco está en la captura — si eso es fácil, el resto funciona.

# Stack

- Backend / API — Node.js + Express
- Base de datos — Supabase (Postgres)
- Frontend web — Next.js
- Mobile — Expo (React Native)

# Formato de entrada

```
monto, item, categoría, fecha, método
```

```
45000, uber, transporte, ayer, ef
12k, rappi, , hoy, tc
590000, arriendo, básicos, 5, tc
```

Delimitadores aceptados: `, | - /`
Categoría y fecha opcionales.
Método default: TC.

# Uso local

```
# bash
npm install

# CLI
npm run cli
npm test

# Servidor
npm start
```

# Roadmap

**Definición** ✅

- 1.1 - Idea y Objetivo
- 1.2 - Gramática
- 1.3 - Flujos Condicionales

**Core — parser** ✅

- 2.1 - Contrato de campos y delimitadores ✅
- 2.2 - Parser: monto, item, categoría, fecha, método ✅
- 2.3 - Categorizer con keywords ✅
- 2.4 - Date parser ✅
- 2.5 - CLI interactivo con suite de tests ✅

**API** ✅

- 3.1 - Servidor Express + endpoint `POST /gastos/parsear` ✅
- 3.2 - Supabase: crear proyecto y tabla ✅
- 3.3 - Endpoint `POST /gastos` — parsear y guardar ✅
- 3.4 - Endpoint `GET /gastos` — leer con filtros básicos ✅

**Deploy API** ✅

- 4.1 - Subir código a GitHub ✅
- 4.2 - Deploy en Railway → URL pública ✅

**Frontend web — dashboard** ✅

- 5.1 - Proyecto Next.js ✅
- 5.2 - Formulario de captura (el input en oración) ✅
- 5.3 - Tabla/lista de gastos del mes ✅
- 5.4 - Resumen por categoría ✅

**Frontend mobile — captura** ✅

- 6.1 - Proyecto Expo ✅
- 6.2 - Pantalla de captura con inputs transparentes ✅
- 6.3 - Conectar a la API pública ✅

**Deploy Frontend** ✅

- 7.1 - Web con Vercel ✅
- 7.2 - Mobile con Expo ✅

**Diseño Tunning**

- 8.1 - Shadcn Components
- 8.2 - UX Upgrade
- 8.3 - Look n feel Upgrade
