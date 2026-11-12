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
| `20261030000000_totales_por_mes.sql` | Crea `public.totales_por_mes(anio)`, que suma por mes en la base en vez de traer el año entero a la API. |
| `20261105000000_contexto_en_gastos.sql` | Agrega `zona` y `hoy_resuelto` a `public.gastos`, con backfill de lo existente. Sin ellas la fecha no se podía volver a derivar desde `input_original`. |
| `20261105010000_preferencias.sql` | Crea `public.preferencias`, con RLS: los flags por perfil (`habilitado` + `activo` por cada uno) y la zona elegida. La fila nace en el primer guardado; si no hay, valen los defaults de las columnas. |
| `20261106000000_edicion_de_gastos.sql` | Agrega `notas`, `editado_en` y `campos_editados` a `public.gastos`. Las políticas de UPDATE y DELETE ya estaban; lo que faltaba era dónde guardar la nota y **qué campos tocó el usuario a mano**. |
| `20261106010000_cuentas.sql` | Crea `public.cuentas`, con RLS, y agrega `gastos.cuenta_id`. Prepara perfil → varias cuentas: la cuenta por defecto nace con el primer movimiento (trigger), el histórico se backfillea, y una foreign key compuesta `(user_id, cuenta_id)` hace imposible colgar un movimiento de la cuenta de otro perfil. |
| `20261107000000_recurrencias.sql` | Crea `public.recurrencias` y `public.ocurrencias_recurrentes`, con RLS, más las funciones `confirmar_ocurrencia_recurrente()` y `editar_recurrencia_desde()`. Una propuesta pendiente es la **ausencia** de una ocurrencia: solo se guardan las decisiones ya tomadas. |
| `20261112000000_renombrar_gastos_a_movimientos.sql` | `public.gastos` pasa a `public.movimientos`, con sus índices, políticas, trigger y `ocurrencias_recurrentes.gasto_id`. Reescribe las funciones plpgsql, cuyo cuerpo es texto y no sigue a la tabla. Deja una vista `public.gastos` como compatibilidad temporal. |
| `20261112010000_fk_movimientos_user_id.sql` | Declara `movimientos.user_id → auth.users(id)`, que producción tenía desde antes del baseline con el nombre `gastos_user_id_fkey` y ninguna migración del repo creaba. No cambia producción: la renombra donde ya está y la crea donde no. |

## Cómo aplicarlas

Con el CLI de Supabase, desde la raíz del repo. Va con `npx`: no hace falta
instalarlo global, y así todos corren la misma versión.

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push --linked
```

Sin CLI, se pueden pegar en orden en el SQL Editor del dashboard. Casi todas
son idempotentes (`if not exists`, `drop policy if exists`, `create or
replace`, y la de `fecha` revisa el tipo actual antes de convertir), así que
correr una dos veces no rompe nada.

La excepción es `20261027000100_rls_gastos.sql`: hace `drop policy if exists`
de los **dos nombres viejos** y después crea los cuatro nuevos sin dropearlos
antes, así que correrla de nuevo falla con *policy already exists* (comprobado
corriendo la carpeta entera dos veces contra un Postgres local). No se corrige
acá porque ya está aplicada y editar una migración aplicada deja el archivo con
otro hash que el que la base registró.

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
