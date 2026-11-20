-- El ancla de un plan sigue a la fecha del movimiento que la ancla
--
-- `vigente_desde` es la fecha de la primera ocurrencia y de ahí sale el día de
-- todas las demás (ver `20261107000000_recurrencias.sql`). Cuando se marca como
-- recurrente un movimiento que ya existe, `atar_recurrencia_a_movimiento`
-- escribe ese ancla con la fecha que el movimiento tiene **en ese momento**, y
-- hasta acá nada volvía a mirarla: corregirle después la fecha al movimiento
-- dejaba el plan proponiendo en el día viejo.
--
-- Pasó de verdad y el síntoma no se parecía a la causa: un movimiento creado un
-- 31 sin fecha escrita, marcado mensual y recién entonces corregido al día 2,
-- se repetía el 30 de noviembre —el 31 recortado al último día del mes corto— y
-- no el 2. Quien lo vio describió "la repetición cae en otra fecha", que suena
-- al cálculo de las ocurrencias y no al ancla.
--
-- Por eso esto es un trigger y no una regla más en la ruta del PATCH: es un
-- invariante del dato —el ancla **es** la fecha del movimiento que la ancla— y
-- así vale para cualquier camino que mueva esa fecha, hoy el PATCH y mañana un
-- reclasificar masivo o un import. Y queda en la misma transacción que el
-- UPDATE: mover el movimiento y no mover el plan es justo el estado roto que
-- esto viene a sacar.
--
-- **Solo el ancla.** Si lo que se edita es una repetición ya confirmada, se
-- mueve ese movimiento y el plan no se toca: `fecha_prevista` es la fecha que
-- el plan proponía y no la del movimiento, que es lo que hace que confirmar la
-- propuesta del 5 corrigiéndola al 7 no devuelva la del 5.

create or replace function public.mover_ancla_con_el_movimiento()
returns trigger
language plpgsql
-- `security definer` por una sola razón: `ocurrencias_recurrentes` no tiene
-- política de UPDATE, y la ausencia es deliberada (cambiarle el estado a una
-- decisión sin crear el movimiento es escribir una fila que miente). Acá no se
-- toca el estado ni el movimiento al que apunta: solo la fecha prevista del
-- ancla, y solo la de la ocurrencia que apunta a este movimiento. Como la
-- función no recibe parámetros, no hay nada que un cliente pueda apuntar a otro
-- perfil, y el par (user_id, recurrencia_id) de la foreign key ya obliga a que
-- el plan sea del mismo.
security definer
set search_path = ''
as $$
declare
  ocurrencia public.ocurrencias_recurrentes;
  plan       public.recurrencias;
begin
  -- `update of fecha` dispara si la columna aparece en el UPDATE, aunque venga
  -- con el mismo valor.
  if new.fecha is not distinct from old.fecha then
    return new;
  end if;

  select * into ocurrencia
    from public.ocurrencias_recurrentes o
   where o.movimiento_id = new.id;

  -- Un movimiento que no salió de ningún plan, que es el caso normal.
  if not found then
    return new;
  end if;

  select * into plan
    from public.recurrencias r
   where r.id = ocurrencia.recurrencia_id;

  if not found then
    return new;
  end if;

  -- Una repetición, no el ancla.
  if ocurrencia.fecha_prevista <> plan.vigente_desde then
    return new;
  end if;

  -- Un plan ya terminado no se reabre moviéndole el ancla, y además el check de
  -- vigencia no admite un `vigente_desde` posterior al `vigente_hasta`.
  if plan.vigente_hasta is not null and new.fecha > plan.vigente_hasta then
    return new;
  end if;

  -- Esa fecha ya tiene una decisión de este plan: moverse ahí chocaría con el
  -- unique, y hacer fallar la edición del movimiento sería peor que dejar el
  -- ancla donde está.
  if exists (
    select 1
      from public.ocurrencias_recurrentes o
     where o.recurrencia_id = plan.id
       and o.fecha_prevista = new.fecha
       and o.id <> ocurrencia.id
  ) then
    return new;
  end if;

  update public.ocurrencias_recurrentes o
     set fecha_prevista = new.fecha
   where o.id = ocurrencia.id;

  update public.recurrencias r
     set vigente_desde  = new.fecha,
         actualizado_en = now()
   where r.id = plan.id;

  return new;
end;
$$;

comment on function public.mover_ancla_con_el_movimiento() is
  'Mueve vigente_desde y la fecha prevista del ancla cuando cambia la fecha del movimiento que la ancla. Las repeticiones no mueven el plan.';

drop trigger if exists movimientos_mueven_su_ancla on public.movimientos;

create trigger movimientos_mueven_su_ancla
  after update of fecha on public.movimientos
  for each row
  execute function public.mover_ancla_con_el_movimiento();
