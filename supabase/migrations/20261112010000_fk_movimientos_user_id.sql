-- movimientos.user_id → auth.users(id)
--
-- Esta migración no cambia producción: declara en el repo una foreign key que
-- producción ya tiene y el repo no conocía.
--
-- La constraint está en la base desde antes del baseline, con el nombre
-- `gastos_user_id_fkey`: la tabla se había creado a mano y
-- `20261027000000_baseline_gastos.sql` se escribió sin ella. El renombre del
-- 12-nov tampoco la tocó, por la misma razón: nadie sabía que estaba.
--
-- Lo que esa diferencia rompía no es producción sino cualquier base levantada
-- desde este repo, que no la reproduce; y los comentarios escritos sobre el
-- repo razonaban sobre una tabla sin foreign key que no existe en ningún lado.
-- Se corrigieron los de `20261106010000_cuentas.sql`.
--
-- Idempotente en los dos sentidos: donde ya está, la renombra —renombrar no
-- revalida las filas, así que no cuesta nada sobre una tabla con datos—; donde
-- no está, la crea.
--
-- Sin `on delete cascade` a propósito, que es además lo que hay en producción:
-- que borrar un perfil con movimientos falle es justamente lo que obliga a
-- `delete_user()` a borrar los movimientos primero y en ese orden. Un cascade
-- acá borraría movimientos sin que nadie lo haya pedido, y dejaría a
-- `delete_user()` pareciendo redundante.

do $$
begin
  if exists (
    select 1 from pg_constraint
     where conname = 'gastos_user_id_fkey'
       and conrelid = 'public.movimientos'::regclass
  ) then
    alter table public.movimientos
      rename constraint gastos_user_id_fkey to movimientos_user_id_fkey;

  elsif not exists (
    select 1 from pg_constraint
     where conname = 'movimientos_user_id_fkey'
       and conrelid = 'public.movimientos'::regclass
  ) then
    alter table public.movimientos
      add constraint movimientos_user_id_fkey
      foreign key (user_id) references auth.users (id);
  end if;
end $$;
