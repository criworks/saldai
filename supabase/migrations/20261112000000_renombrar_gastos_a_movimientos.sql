-- public.gastos pasa a llamarse public.movimientos
--
-- El nombre `gasto` dejó de describir lo que la tabla guarda. Al sistema no le
-- importa si un monto es un gasto: es un monto, y el día que entren ingresos o
-- traspasos van a ser filas de esta misma tabla, porque los diferencia la
-- aritmética y no sus campos. Un nombre que ya no es cierto se paga en cada
-- lectura del código, y con 73 filas, un solo escritor y ningún log de eventos
-- este renombre no va a ser más barato después.
--
-- `alter table ... rename` no reescribe datos: cambia el nombre en el catálogo
-- y todo lo que apuntaba a la tabla por OID —las vistas, las foreign keys, los
-- cuerpos de las funciones SQL— sigue apuntando a ella sola. Lo que **no**
-- sigue solo son los cuerpos de las funciones plpgsql, que son texto y se
-- vuelven a parsear en cada ejecución: esos hay que reescribirlos acá o la
-- primera llamada después del rename falla con "relation does not exist", sin
-- que nada lo anuncie antes. Por eso esta migración recrea las funciones
-- aunque su lógica no cambie.

-- ── La tabla y todo lo que lleva su nombre ──────────────────────────────────

alter table public.gastos rename to movimientos;

alter index if exists gastos_pkey                   rename to movimientos_pkey;
alter index if exists gastos_user_id_creado_en_idx  rename to movimientos_user_id_creado_en_idx;
alter index if exists gastos_user_id_fecha_idx      rename to movimientos_user_id_fecha_idx;

alter table public.movimientos
  rename constraint gastos_user_id_id_key to movimientos_user_id_id_key;
alter table public.movimientos
  rename constraint gastos_cuenta_del_mismo_perfil_fkey
                 to movimientos_cuenta_del_mismo_perfil_fkey;

alter policy "gastos_select_propios" on public.movimientos rename to "movimientos_select_propios";
alter policy "gastos_insert_propios" on public.movimientos rename to "movimientos_insert_propios";
alter policy "gastos_update_propios" on public.movimientos rename to "movimientos_update_propios";
alter policy "gastos_delete_propios" on public.movimientos rename to "movimientos_delete_propios";

alter trigger gastos_asignar_cuenta on public.movimientos
  rename to movimientos_asignar_cuenta;

comment on table public.movimientos is
  'Los movimientos de la persona. Un movimiento es un monto con su clasificación; que sea gasto o ingreso lo decide la aritmética, no la fila.';

-- ── La ocurrencia apunta a un movimiento, no a un gasto ─────────────────────

alter table public.ocurrencias_recurrentes
  rename column gasto_id to movimiento_id;

alter table public.ocurrencias_recurrentes
  rename constraint ocurrencias_confirmada_con_gasto
                 to ocurrencias_confirmada_con_movimiento;
alter table public.ocurrencias_recurrentes
  rename constraint ocurrencias_gasto_del_mismo_perfil_fkey
                 to ocurrencias_movimiento_del_mismo_perfil_fkey;

comment on column public.ocurrencias_recurrentes.movimiento_id is
  'El movimiento que creó la confirmación. Null en las omitidas.';

-- ── Las funciones que nombran la tabla en texto ─────────────────────────────
--
-- Mismo cuerpo que antes, con el nombre nuevo. `totales_por_mes` es `language
-- sql` y habría seguido funcionando sola, pero queda reescrita igual: una
-- función cuyo texto dice `gastos` y cuyo plan lee `movimientos` es justo la
-- clase de cosa que después nadie entiende.

create or replace function public.totales_por_mes(anio integer)
returns table (mes smallint, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select extract(month from m.fecha)::smallint as mes,
         sum(m.monto)::bigint as total
    from public.movimientos m
   where m.user_id = (select auth.uid())
     and m.fecha >= make_date(anio, 1, 1)
     and m.fecha <  make_date(anio + 1, 1, 1)
   group by 1
   order by 1;
$$;

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_usuario uuid := auth.uid();
begin
  if id_usuario is null then
    raise exception 'No hay sesión activa';
  end if;

  delete from public.movimientos where user_id = id_usuario;
  delete from auth.users where id = id_usuario;
end;
$$;

-- El tipo de retorno es el mismo objeto de siempre: renombrar la tabla también
-- renombró su tipo compuesto, así que esto reemplaza la función y no crea otra.
create or replace function public.confirmar_ocurrencia_recurrente(
  p_recurrencia_id   uuid,
  p_fecha_prevista   date,
  p_fecha            date,
  p_monto            integer,
  p_monto_formateado text,
  p_item             text,
  p_categoria        text,
  p_categoria_src    text,
  p_metodo           text,
  p_notas            text,
  p_campos_editados  text[]
)
returns public.movimientos
language plpgsql
security invoker
set search_path = ''
as $$
declare
  plan  public.recurrencias;
  fila  public.movimientos;
begin
  select * into plan
    from public.recurrencias r
   where r.id = p_recurrencia_id;

  -- Con la RLS puesta, un plan de otro perfil no se ve: no se distingue de uno
  -- que no existe, y las dos cosas son un 404 para la API.
  if not found then
    raise exception 'No existe esa recurrencia' using errcode = 'no_data_found';
  end if;

  insert into public.movimientos (
    monto, monto_formateado, item, categoria, categoria_src, metodo, fecha,
    notas, user_id, zona, campos_editados,
    -- Se marca editado solo si el usuario tocó algo al confirmar: la marca es
    -- sobre lo que él decidió, no sobre lo que el plan propuso.
    editado_en
  )
  values (
    p_monto, p_monto_formateado, p_item, p_categoria, p_categoria_src, p_metodo,
    p_fecha, p_notas, plan.user_id, plan.zona,
    coalesce(p_campos_editados, '{}'::text[]),
    case when coalesce(array_length(p_campos_editados, 1), 0) > 0 then now() end
  )
  returning * into fila;

  insert into public.ocurrencias_recurrentes (
    user_id, recurrencia_id, fecha_prevista, estado, movimiento_id
  )
  values (plan.user_id, p_recurrencia_id, p_fecha_prevista, 'confirmada', fila.id);

  return fila;
end;
$$;

-- ── Una vista `gastos` mientras la API vieja siga en pie ────────────────────
--
-- Las migraciones las aplica una persona a mano y el deploy de Render sale solo
-- al mergear a `main`: los dos momentos no coinciden, así que entre uno y otro
-- hay una API que nombra `gastos` contra una base que ya no la tiene, o al
-- revés. Sin esta vista ese hueco es la API caída, y no da ningún error que
-- diga por qué: la fila simplemente no existe.
--
-- Es una vista de una sola tabla sin agregación, o sea actualizable sola:
-- insert, update y delete pasan derecho a `movimientos` y el trigger de la
-- cuenta predeterminada se dispara igual, porque vive en la tabla.
-- `security_invoker` es lo que hace que las políticas RLS que apliquen sean las
-- de quien consulta y no las del dueño de la vista; sin eso la vista sería un
-- agujero que deja ver los movimientos de todos.
--
-- **Es temporal.** Se borra en la migración que siga al release que lleve el
-- renombre a producción, cuando ninguna API ni ningún build de la app en un
-- teléfono le hablen más a `/gastos`.

create or replace view public.gastos
with (security_invoker = true)
as select * from public.movimientos;

comment on view public.gastos is
  'Compatibilidad temporal para la API y los builds de la app anteriores al renombre. Borrar cuando nada le hable más a /gastos.';

grant select, insert, update, delete on public.gastos to authenticated;

-- PostgREST cachea el schema: sin esto la vista no aparece hasta el próximo
-- reinicio, que es cuando ya no hace falta.
notify pgrst, 'reload schema';
