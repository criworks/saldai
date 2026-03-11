# STACK.md — Decisiones técnicas

## Resumen

| Capa | Tecnología | Versión |
|---|---|---|
| Parser core | Node.js puro | 22.x |
| API | Express | 4.x |
| Base de datos | Supabase (Postgres) | - |
| Web | Next.js App Router | 14.x |
| Mobile | Expo + React Native | SDK 51+ |
| UI Mobile | NativeWind v4 + RN Reusables | - |
| Deploy API | Railway | - |
| Deploy Web | Vercel | - |
| Deploy Mobile | EAS Build | - |
| Tokens compartidos | `@expenses/ui` (local) | - |

---

## Decisiones y por qué

### Parser sin AI

El parser de gastos usa keyword matching y parsing posicional, no AI. Decisión intencional para el POC: sin costo de API, sin latencia, funciona offline. La arquitectura permite agregar AI como capa posterior sin cambiar el contrato de inputs/outputs.

### Express sobre NestJS / Fastify

Para un proyecto personal con pocos endpoints, Express es suficiente y tiene cero overhead de configuración. Si el proyecto crece, migrar a Fastify es directo — misma API, mejor performance.

### Supabase sobre Firebase / PlanetScale

Postgres como base de datos (no NoSQL), SDK limpio, auth incluido, dashboard visual para inspección, free tier generoso. El cliente de Supabase se usa solo en `api/` — nunca expuesto al cliente browser o mobile directamente.

### Next.js App Router

Full stack en un solo proyecto, deploy trivial en Vercel, Server Components disponibles para el futuro. El `web/` está en desarrollo — por ahora solo tiene el formulario de captura y el dashboard básico.

### Expo sobre React Native CLI

EAS Build permite generar APKs sin Xcode ni Android Studio en la máquina local. Expo Go acelera el desarrollo. El tradeoff de no tener control total del build nativo es aceptable para este proyecto.

### NativeWind v4 + RN Reusables

NativeWind lleva Tailwind a React Native — mismo lenguaje de estilos que `web/`. RN Reusables sigue el modelo copy-paste de shadcn/ui: los componentes son código propio, sin black box. Permite customización total.

### Monorepo sin Turborepo / nx

Para tres aplicaciones y un paquete compartido, los workspaces de npm son suficientes. Turborepo agrega valor cuando hay builds incrementales complejos o muchos paquetes. Se puede agregar en el futuro sin cambiar la estructura.

### TypeScript solo en mobile

El parser core y la API están en JavaScript por simplicidad y velocidad de desarrollo. Mobile está en TypeScript porque los componentes de RN Reusables lo requieren y los tipos ayudan con la complejidad de React Native. Web migrará a TypeScript cuando se desarrolle más.

---

## Lo que se decidió NO hacer (y por qué)

| Alternativa descartada | Por qué |
|---|---|
| WhatsApp como captura | Setup de Twilio/Meta complejo para POC |
| AI para categorización | Costo de API + latencia innecesarios en POC |
| React Native Web | Fricción de configuración con Next.js, output DOM no óptimo |
| Tamagui | Demasiado complejo para el tamaño actual del proyecto |
| Firebase | NoSQL no ideal para datos financieros tabulares |
| Turborepo | Overhead innecesario para 3 apps + 1 paquete |

---

## Convenciones de código

### Commits

```
feat: descripción      ← nueva funcionalidad
fix: descripción       ← corrección de bug
chore: descripción     ← configuración, deps, refactor menor
docs: descripción      ← documentación
```

### Nombres de archivos

- Componentes React: `PascalCase.tsx`
- Hooks: `camelCase.ts` con prefijo `use`
- Utilities: `camelCase.ts`
- Skills / docs: `UPPERCASE.md`

### Variables de entorno

- API: prefijo ninguno — `SUPABASE_URL`
- Web: prefijo `NEXT_PUBLIC_` — `NEXT_PUBLIC_API_URL`
- Mobile: prefijo `EXPO_PUBLIC_` — `EXPO_PUBLIC_API_URL`
