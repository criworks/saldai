-- Políticas RLS de public.gastos
--
-- Antes de esta migración la tabla tenía solo SELECT e INSERT, así que la app
-- no podía editar ni borrar un gasto: cualquier intento fallaba en silencio
-- devolviendo cero filas. Se agregan UPDATE y DELETE, siempre acotadas al
-- dueño de la fila.
--
-- Dos cambios más en las que ya existían:
--   1. El rol pasa de `public` (que incluye `anon`) a `authenticated`. Sin
--      sesión no hay nada que ver, así que no tiene sentido evaluar la
--      política para un anónimo.
--   2. `auth.uid()` queda envuelto en `(select auth.uid())`. Así Postgres la
--      evalúa una vez por consulta en vez de una vez por fila, que es la
--      recomendación de Supabase y lo que marcaba el advisor de performance.

alter table public.gastos enable row level security;

drop policy if exists "usuario ve sus gastos" on public.gastos;
drop policy if exists "usuario inserta sus gastos" on public.gastos;

create policy "gastos_select_propios"
  on public.gastos
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "gastos_insert_propios"
  on public.gastos
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "gastos_update_propios"
  on public.gastos
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "gastos_delete_propios"
  on public.gastos
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
