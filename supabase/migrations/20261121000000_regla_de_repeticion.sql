-- La regla de repetición de un plan: el ancla pasa a ser el default, no la
-- única fuente
--
-- La migración de `recurrencias` (07-nov) decía, textual: *"No hay columna
-- `dia_del_mes` ni `dia_de_la_semana`: `vigente_desde` es la fecha de la
-- primera ocurrencia y de ahí sale todo lo demás. Con columnas aparte se puede
-- escribir la contradicción (ancla un martes y `dia_de_la_semana` = viernes) y
-- después hay que decidir cuál gana."*
--
-- El argumento era correcto y lo que cambió es el requisito: ahora el usuario
-- **quiere** poder decir "ancla el martes 2, pero repetime los viernes". Así
-- que ya no hay contradicción que resolver, porque está decidido quién gana:
--
--   * **La regla gana sobre el ancla. El ancla solo dice desde cuándo.**
--   * **Las columnas en `null` significan "derivá del ancla"**, que es
--     exactamente lo que el código hacía cuando no existían. Por eso esta
--     migración es aditiva y ningún plan ya guardado cambia de fechas.
--
-- La ocurrencia 0 sigue siendo el ancla tal cual, cumpla la regla o no: un plan
-- atado a un movimiento cierra esa fecha como primera ocurrencia confirmada
-- (`atar_recurrencia_a_movimiento` escribe `fecha_prevista = vigente_desde`), y
-- si la regla pudiera moverla, esa decisión quedaría apuntando a una fecha que
-- el plan no propone y la propuesta real reaparecería como pendiente.
--
-- El cálculo sigue viviendo en `@saldai/core/recurrencias` y no acá, porque la
-- app tiene que proponer lo mismo que la API.

-- ── Las columnas ────────────────────────────────────────────────────────────

alter table public.recurrencias
  add column if not exists dia_de_la_semana smallint,
  add column if not exists semana_del_mes   smallint,
  add column if not exists dia_del_mes      smallint,
  add column if not exists mes_del_anio     smallint;

comment on column public.recurrencias.dia_de_la_semana is
  '0 domingo a 6 sábado, como getUTCDay(). Null = el día de la semana del ancla.';
comment on column public.recurrencias.semana_del_mes is
  '1 a 4, o -1 para la última. Solo junto a dia_de_la_semana, y nunca 5: un quinto viernes no existe en todos los meses.';
comment on column public.recurrencias.dia_del_mes is
  'Null = el día del mes del ancla. Un día que el mes no tiene cae el último día, igual que el ancla.';
comment on column public.recurrencias.mes_del_anio is
  '1 a 12, solo en un plan anual. Null = el mes del ancla.';

alter table public.recurrencias
  drop constraint if exists recurrencias_regla_en_rango;
alter table public.recurrencias
  add constraint recurrencias_regla_en_rango check (
    (dia_de_la_semana is null or dia_de_la_semana between 0 and 6)
    -- El 5 queda afuera a propósito: "el quinto viernes" se saltearía los meses
    -- que tienen cuatro, así que "la última" es un valor propio (-1) y no un 5
    -- que a veces hay que recortar en silencio.
    and (semana_del_mes is null or semana_del_mes in (-1, 1, 2, 3, 4))
    and (dia_del_mes is null or dia_del_mes between 1 and 31)
    and (mes_del_anio is null or mes_del_anio between 1 and 12)
  );

-- Qué combinaciones tienen sentido, por frecuencia. El check está porque una
-- regla incoherente no falla al escribirse: falla meses después, cuando alguien
-- deriva las fechas y el plan propone algo que nadie pidió.
alter table public.recurrencias
  drop constraint if exists recurrencias_regla_coherente;
alter table public.recurrencias
  add constraint recurrencias_regla_coherente check (
    case frecuencia
      -- Semanal: solo el día de la semana.
      when 'semanal' then
        semana_del_mes is null and dia_del_mes is null and mes_del_anio is null
      -- Mensual y anual: o el día del calendario, o el día de la semana con su
      -- semana del mes, nunca los dos. Y la semana del mes no significa nada
      -- sola.
      when 'mensual' then
        mes_del_anio is null
        and not (dia_del_mes is not null and dia_de_la_semana is not null)
        and (dia_de_la_semana is null) = (semana_del_mes is null)
      when 'anual' then
        not (dia_del_mes is not null and dia_de_la_semana is not null)
        and (dia_de_la_semana is null) = (semana_del_mes is null)
      else true
    end
  );

-- ── Las funciones que escriben un plan ──────────────────────────────────────
--
-- **Agregarle un parámetro a una función de Postgres no la reemplaza: la
-- sobrecarga.** `create or replace` con una firma distinta deja las dos
-- funciones existiendo, y PostgREST elige según los nombres de los argumentos
-- que le manden. Eso es una trampa y acá es, además, la salida:
--
--   * **La trampa:** si la API mandara la regla solo a veces, un `PATCH` podría
--     caer en la función vieja, guardar el plan **sin** regla y responder 200,
--     sin ningún error que mirar. Por eso la API manda **siempre** los cuatro
--     parámetros, con `null` cuando no hay regla
--     (`api/src/recurrencias/columnas.js`): con las cuatro claves presentes la
--     única firma que calza es la nueva.
--   * **La salida:** las migraciones las aplica una persona a mano y el deploy
--     de Render sale solo al mergear a `main`, así que los dos momentos no
--     coinciden. Si esta migración borrara las firmas viejas, la API que está en
--     producción quedaría llamando funciones que ya no existen —y al revés, si
--     el deploy va primero, la API nueva llama firmas que la base todavía no
--     tiene—. **Las dos versiones conviven**, igual que convivieron la vista
--     `public.gastos` y la ruta `/gastos` en el renombre, y por la misma razón.
--
-- **Las firmas viejas son temporales.** Se borran en una migración posterior al
-- release que lleve la regla a producción, cuando ninguna API les hable más.

create or replace function public.editar_recurrencia_desde(
  p_recurrencia_id    uuid,
  p_desde             date,
  p_monto             integer,
  p_monto_formateado  text,
  p_item              text,
  p_categoria         text,
  p_categoria_src     text,
  p_metodo            text,
  p_notas             text,
  p_frecuencia        text,
  p_dia_de_la_semana  smallint,
  p_semana_del_mes    smallint,
  p_dia_del_mes       smallint,
  p_mes_del_anio      smallint,
  p_vigente_hasta     date
)
returns public.recurrencias
language plpgsql
security invoker
set search_path = ''
as $$
declare
  plan   public.recurrencias;
  nuevo  public.recurrencias;
begin
  select * into plan
    from public.recurrencias r
   where r.id = p_recurrencia_id;

  if not found then
    raise exception 'No existe esa recurrencia' using errcode = 'no_data_found';
  end if;

  -- Si `p_desde` es anterior o igual al comienzo del plan no hay historia que
  -- preservar: no queda ninguna fecha del plan viejo, así que se edita en el
  -- lugar y no se deja un plan de vigencia vacía en la lista.
  if p_desde <= plan.vigente_desde then
    update public.recurrencias r
       set monto            = p_monto,
           monto_formateado = p_monto_formateado,
           item             = p_item,
           categoria        = p_categoria,
           categoria_src    = p_categoria_src,
           metodo           = p_metodo,
           notas            = p_notas,
           frecuencia       = p_frecuencia,
           dia_de_la_semana = p_dia_de_la_semana,
           semana_del_mes   = p_semana_del_mes,
           dia_del_mes      = p_dia_del_mes,
           mes_del_anio     = p_mes_del_anio,
           vigente_desde    = p_desde,
           vigente_hasta    = p_vigente_hasta,
           actualizado_en   = now()
     where r.id = p_recurrencia_id
    returning * into nuevo;

    return nuevo;
  end if;

  update public.recurrencias r
     set vigente_hasta  = p_desde - 1,
         actualizado_en = now()
   where r.id = p_recurrencia_id;

  insert into public.recurrencias (
    user_id, monto, monto_formateado, item, categoria, categoria_src, metodo,
    notas, frecuencia, dia_de_la_semana, semana_del_mes, dia_del_mes,
    mes_del_anio, vigente_desde, vigente_hasta, input_original, zona,
    hoy_resuelto, plan_anterior_id
  )
  values (
    plan.user_id, p_monto, p_monto_formateado, p_item, p_categoria,
    p_categoria_src, p_metodo, p_notas, p_frecuencia, p_dia_de_la_semana,
    p_semana_del_mes, p_dia_del_mes, p_mes_del_anio, p_desde, p_vigente_hasta,
    plan.input_original, plan.zona, plan.hoy_resuelto, plan.id
  )
  returning * into nuevo;

  return nuevo;
end;
$$;

create or replace function public.atar_recurrencia_a_movimiento(
  p_movimiento_id    uuid,
  p_frecuencia       text,
  p_dia_de_la_semana smallint,
  p_semana_del_mes   smallint,
  p_dia_del_mes      smallint,
  p_mes_del_anio     smallint,
  p_vigente_hasta    date
)
returns public.recurrencias
language plpgsql
security invoker
set search_path = ''
as $$
declare
  mov   public.movimientos;
  plan  public.recurrencias;
begin
  select * into mov
    from public.movimientos m
   where m.id = p_movimiento_id;

  if not found then
    raise exception 'No existe ese movimiento' using errcode = 'no_data_found';
  end if;

  insert into public.recurrencias (
    user_id, monto, monto_formateado, item, categoria, categoria_src, metodo,
    notas, frecuencia, dia_de_la_semana, semana_del_mes, dia_del_mes,
    mes_del_anio, vigente_desde, vigente_hasta, zona
  )
  values (
    mov.user_id, mov.monto, mov.monto_formateado, mov.item, mov.categoria,
    mov.categoria_src, mov.metodo, mov.notas, p_frecuencia,
    p_dia_de_la_semana, p_semana_del_mes, p_dia_del_mes, p_mes_del_anio,
    -- El ancla es la fecha del movimiento: es lo que conserva el día del mes
    -- cuando no hay regla, y lo que marca desde cuándo vale la regla cuando la
    -- hay.
    mov.fecha, p_vigente_hasta, mov.zona
  )
  returning * into plan;

  insert into public.ocurrencias_recurrentes (
    user_id, recurrencia_id, fecha_prevista, estado, movimiento_id
  )
  values (mov.user_id, plan.id, mov.fecha, 'confirmada', mov.id);

  return plan;
end;
$$;

create or replace function public.crear_movimiento_con_recurrencia(
  p_user_id          uuid,
  p_monto            integer,
  p_monto_formateado text,
  p_item             text,
  p_categoria        text,
  p_categoria_src    text,
  p_metodo           text,
  p_fecha            date,
  p_input_original   text,
  p_zona             text,
  p_hoy_resuelto     date,
  p_frecuencia       text,
  p_dia_de_la_semana smallint,
  p_semana_del_mes   smallint,
  p_dia_del_mes      smallint,
  p_mes_del_anio     smallint,
  p_vigente_hasta    date
)
returns public.movimientos_con_recurrencia
language plpgsql
security invoker
set search_path = ''
as $$
declare
  fila  public.movimientos;
  final public.movimientos_con_recurrencia;
begin
  insert into public.movimientos (
    user_id, monto, monto_formateado, item, categoria, categoria_src, metodo,
    fecha, input_original, zona, hoy_resuelto
  )
  values (
    p_user_id, p_monto, p_monto_formateado, p_item, p_categoria,
    p_categoria_src, p_metodo, p_fecha, p_input_original, p_zona,
    p_hoy_resuelto
  )
  returning * into fila;

  perform public.atar_recurrencia_a_movimiento(
    fila.id, p_frecuencia, p_dia_de_la_semana, p_semana_del_mes, p_dia_del_mes,
    p_mes_del_anio, p_vigente_hasta
  );

  select * into final
    from public.movimientos_con_recurrencia v
   where v.id = fila.id;

  return final;
end;
$$;

-- PostgREST cachea el schema: sin esto las firmas nuevas no aparecen hasta el
-- próximo reinicio, y las llamadas con regla no encontrarían función.
notify pgrst, 'reload schema';
