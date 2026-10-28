-- `public.gastos.fecha` pasa de text (DD/MM/AAAA) a date.
--
-- Guardar la fecha como texto hacía que no se pudiera filtrar ni ordenar por
-- ella: la API resolvía "los gastos de octubre" con `fecha ilike '%/10/%'`, que
-- mezcla octubre de todos los años. Con un date real el filtro es un rango.
--
-- Idempotente: si la columna ya es date, no hace nada. Antes de convertir
-- verifica que cada valor sea un DD/MM/AAAA que vuelva a sí mismo al
-- formatearlo, para no dejar que to_date() "arregle" en silencio una fecha que
-- no existe (31/02 se convertiría en 03/03).

do $$
declare
  tipo_actual text;
  no_convertibles integer;
begin
  select data_type into tipo_actual
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'gastos'
     and column_name = 'fecha';

  if tipo_actual is null then
    raise exception 'public.gastos.fecha no existe';
  end if;

  if tipo_actual = 'date' then
    raise notice 'public.gastos.fecha ya es date, no hay nada que convertir';
    return;
  end if;

  -- Se compara contra el texto original, normalizando el relleno con ceros.
  select count(*) into no_convertibles
    from public.gastos
   where fecha is not null
     and (
       fecha !~ '^\d{1,2}/\d{1,2}/\d{4}$'
       or to_char(to_date(fecha, 'DD/MM/YYYY'), 'DD/MM/YYYY')
          <> lpad(split_part(fecha, '/', 1), 2, '0') || '/'
          || lpad(split_part(fecha, '/', 2), 2, '0') || '/'
          || split_part(fecha, '/', 3)
     );

  if no_convertibles > 0 then
    raise exception 'Hay % filas con fecha que no es un DD/MM/AAAA válido; revisar antes de migrar', no_convertibles;
  end if;

  alter table public.gastos
    alter column fecha type date
    using case when fecha is null then null else to_date(fecha, 'DD/MM/YYYY') end;
end $$;

-- El filtro por mes y el listado anual consultan por user_id + rango de fecha.
create index if not exists gastos_user_id_fecha_idx
  on public.gastos (user_id, fecha desc);
