-- public.totales_por_mes(anio)
--
-- `GET /gastos/anuales` traía todas las filas del año para sumarlas en
-- JavaScript: con un año de uso normal son cientos de filas cruzando la red
-- para devolver doce números. Esta función hace la suma en la base, que es
-- donde están los datos, y usa el índice (user_id, fecha) que ya existe.
--
-- Va como `security invoker` (el default) a propósito: así la consulta corre
-- con los permisos de quien llama y las políticas RLS de `public.gastos`
-- aplican igual que en cualquier select. El filtro por `user_id` es explícito
-- además de la política, para que el plan use el índice y no dependa de cómo
-- Postgres acomode la condición de la política.
--
-- `search_path = ''` obliga a nombres calificados, para que nadie pueda
-- desviar la función creando un objeto con el mismo nombre en otro schema.

create or replace function public.totales_por_mes(anio integer)
returns table (mes smallint, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select extract(month from g.fecha)::smallint as mes,
         sum(g.monto)::bigint as total
    from public.gastos g
   where g.user_id = (select auth.uid())
     and g.fecha >= make_date(anio, 1, 1)
     and g.fecha <  make_date(anio + 1, 1, 1)
   group by 1
   order by 1;
$$;

revoke all on function public.totales_por_mes(integer) from public;
revoke all on function public.totales_por_mes(integer) from anon;
grant execute on function public.totales_por_mes(integer) to authenticated;
