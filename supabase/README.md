# Migraciones de Supabase

Hasta ahora el schema se editaba a mano desde el dashboard y el proyecto no
tenía ninguna migración registrada: no había forma de saber cómo llegó la base
a su estado actual ni de reconstruirla en otro ambiente. Desde acá, todo cambio
de schema, política RLS o función entra como un archivo en `migrations/`.

## Orden

Los archivos se aplican por nombre, así que el prefijo es la fecha y hora en
UTC (`AAAAMMDDHHMMSS_descripcion.sql`).

| Archivo | Qué hace |
|---------|----------|
| `20261027000000_baseline_gastos.sql` | Deja por escrito el estado actual de `public.gastos`. Idempotente: correrla sobre el proyecto que ya existe no cambia nada. |
| `20261027000100_rls_gastos.sql` | Agrega las políticas UPDATE y DELETE que faltaban, acota las existentes al rol `authenticated` y envuelve `auth.uid()` en `(select ...)`. |
| `20261027000200_index_gastos_user_id.sql` | Índice `(user_id, creado_en desc)`. La tabla solo tenía el de la primary key. |
| `20261027000300_delete_user.sql` | Crea `public.delete_user()`, que mobile ya llamaba pero no existía. |
| `20261028000000_fecha_a_date.sql` | `gastos.fecha` pasa de text (`DD/MM/AAAA`) a `date`, convirtiendo los datos existentes, más el índice `(user_id, fecha desc)`. Verifica antes que cada valor sea un `DD/MM/AAAA` válido y falla sin tocar nada si alguno no lo es. |

## Cómo aplicarlas

Con el CLI de Supabase, desde la raíz del repo:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push --linked
```

Sin CLI, se pueden pegar en orden en el SQL Editor del dashboard. Son todas
idempotentes (`if not exists`, `drop policy if exists`, `create or replace`, y
la de `fecha` revisa el tipo actual antes de convertir), así que correr una dos
veces no rompe nada.

`20261028000000_fecha_a_date.sql` cambia el tipo de una columna que la API lee,
así que va junto con el deploy del API, no antes: con la columna ya en `date` y
el código viejo corriendo, el filtro por mes (`fecha ilike '%/10/%'`) deja de
devolver filas.

## Reglas

- Nada de editar el schema desde el dashboard: el cambio se escribe acá y se
  aplica desde el archivo, así el repo y la base no se separan.
- Una migración por cambio, con un comentario arriba que diga por qué, no solo
  qué.
- Toda tabla nueva arranca con `enable row level security` y sus políticas en
  la misma migración.
