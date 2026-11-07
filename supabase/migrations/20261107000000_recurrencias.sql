-- public.recurrencias y public.ocurrencias_recurrentes: recurrencia con confirmación
--
-- Un plan de recurrencia **no registra movimientos**: propone, y confirmar es
-- lo que los crea. La decisión es de producto —"confirmar deja el movimiento en
-- la memoria humana; lo automático no"— y además es la opción barata, porque no
-- hace falta ningún proceso que corra solo: no hay cron en este stack.
--
-- ── Las propuestas no se guardan ───────────────────────────────────────────
--
-- Lo primero que uno escribe es una tabla de propuestas que alguien va
-- llenando, o peor, filas en `gastos` con `estado = 'pendiente'`. Las dos están
-- descartadas y por razones distintas:
--
--   * Con `estado` en `gastos`, **toda** consulta que sume tiene que filtrar por
--     estado. `totales_por_mes`, el `GET /gastos`, el total del mes de la app.
--     Un solo olvido infla el total del usuario y no da ningún error: el número
--     simplemente queda mal.
--   * Una tabla de propuestas materializadas necesita quién las escriba y qué
--     pasa cuando el plan cambia: propuestas viejas con el monto viejo, y un
--     backfill cada vez que se edita un plan.
--
-- Acá una propuesta pendiente es **la ausencia de una fila**: se derivan del
-- plan (frecuencia + fecha ancla) y lo único que se guarda es la decisión que
-- el usuario ya tomó sobre una fecha concreta. Es el mismo principio que el mes
-- contable: derivar en vez de duplicar.
--
-- ── El día sale de la fecha ancla ──────────────────────────────────────────
--
-- No hay columna `dia_del_mes` ni `dia_de_la_semana`: `vigente_desde` es la
-- fecha de la primera ocurrencia y de ahí sale todo lo demás —el día del mes
-- para `mensual`, el día de la semana para `semanal`, el día y el mes para
-- `anual`. Con columnas aparte se puede escribir la contradicción (ancla un
-- martes y `dia_de_la_semana` = viernes) y después hay que decidir cuál gana.
--
-- Un plan mensual anclado un 31 **no se saltea los meses cortos**: la
-- ocurrencia cae el último día del mes. Es distinto del día de corte de una
-- tarjeta, que se restringe a 1–28 porque ahí el 31 de febrero no existe como
-- concepto; acá saltearlo haría desaparecer el arriendo en febrero, que es
-- justo el caso de uso. El cálculo vive en `@saldai/core/recurrencias`, no en
-- esta migración, porque la app tiene que proponer lo mismo que la API.

-- ── El plan ─────────────────────────────────────────────────────────────────

create table if not exists public.recurrencias (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,

  -- La definición del movimiento que se va a proponer. Son las mismas columnas
  -- que `gastos` y a propósito: confirmar copia, no traduce. Si el plan
  -- guardara solo el texto, cada propuesta tendría que volver a correr el
  -- parser y la propuesta cambiaría el día que cambie el catálogo de
  -- categorías.
  monto            integer not null check (monto > 0),
  monto_formateado text,
  item             text not null,
  categoria        text,
  categoria_src    text,
  metodo           text,
  notas            text,

  frecuencia       text not null check (frecuencia in ('semanal', 'mensual', 'anual')),

  -- La fecha de la primera ocurrencia, y el ancla de todas las demás.
  vigente_desde    date not null,
  -- Último día en que el plan propone, inclusive. Null = sin fin. Terminar un
  -- plan es escribir acá, no borrarlo (ver abajo por qué no hay DELETE).
  vigente_hasta    date,

  -- La línea que la persona escribió al crear el plan, con el contexto con el
  -- que se leyó, igual que en `gastos`. Acá sí tiene sentido guardarla: es
  -- texto que alguien escribió. En el movimiento que genera una ocurrencia
  -- queda en null, y más abajo está el por qué.
  input_original   text,
  zona             text,
  hoy_resuelto     date,

  -- "Editar de aquí en adelante" cierra este plan y crea el siguiente, que
  -- apunta acá. Sin la cadena, un cambio de monto le cambiaría el monto a las
  -- propuestas pendientes de meses anteriores, que son del plan viejo.
  plan_anterior_id uuid,

  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),

  constraint recurrencias_vigencia_coherente
    check (vigente_hasta is null or vigente_hasta >= vigente_desde),

  -- La mitad "padre" de la foreign key compuesta de las ocurrencias: así una
  -- ocurrencia no puede colgar del plan de otro perfil.
  constraint recurrencias_user_id_id_key unique (user_id, id)
);

comment on table public.recurrencias is
  'Planes de recurrencia. Proponen movimientos; no los registran. Confirmar es lo que crea el movimiento.';
comment on column public.recurrencias.vigente_desde is
  'Fecha de la primera ocurrencia y ancla de las siguientes: de acá sale el día del mes, el de la semana o el día y mes.';
comment on column public.recurrencias.vigente_hasta is
  'Último día en que propone, inclusive. Null = sin fin. Terminar un plan es escribir acá.';
comment on column public.recurrencias.plan_anterior_id is
  'El plan que este reemplaza, cuando el usuario editó "de aquí en adelante".';

-- Los planes se leen siempre por perfil.
create index if not exists recurrencias_user_id_idx
  on public.recurrencias (user_id);

alter table public.recurrencias enable row level security;

drop policy if exists "recurrencias_select_propias" on public.recurrencias;
drop policy if exists "recurrencias_insert_propias" on public.recurrencias;
drop policy if exists "recurrencias_update_propias" on public.recurrencias;

create policy "recurrencias_select_propias"
  on public.recurrencias
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "recurrencias_insert_propias"
  on public.recurrencias
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "recurrencias_update_propias"
  on public.recurrencias
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- **No hay política de DELETE, y la ausencia es la decisión**, igual que en
-- `cuentas`. Borrar un plan borraría con él las omisiones que el usuario
-- decidió y el rastro de qué movimiento salió de qué plan, y los movimientos ya
-- confirmados quedarían sin explicación. Lo que el usuario quiere decir con
-- "ya no lo quiero" es que deje de proponer, y eso es `vigente_hasta`.

-- ── La decisión sobre una fecha concreta ────────────────────────────────────
--
-- Una fila acá significa "sobre esta fecha de este plan ya decidí". Lo que no
-- tiene fila está pendiente. No existe el estado 'pendiente': sería una fila
-- que hay que crear antes de poder ignorarla, o sea un generador.

create table if not exists public.ocurrencias_recurrentes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  recurrencia_id  uuid not null,

  -- La fecha que el plan proponía. No es la fecha del movimiento: el usuario
  -- puede confirmar la propuesta del 5 corrigiéndole la fecha al 7, y entonces
  -- esta columna sigue diciendo 5, que es lo que hace que la propuesta del 5 no
  -- vuelva a aparecer.
  fecha_prevista  date not null,

  estado          text not null check (estado in ('confirmada', 'omitida')),

  -- El movimiento que creó la confirmación. Null en las omitidas.
  gasto_id        uuid,

  decidido_en     timestamptz not null default now(),

  -- Una decisión por fecha. Es lo que impide que dos toques seguidos en
  -- "confirmar" creen dos movimientos, y por eso la confirmación tiene que
  -- escribir las dos tablas en la misma transacción (ver la función de abajo).
  constraint ocurrencias_una_por_fecha unique (recurrencia_id, fecha_prevista),

  constraint ocurrencias_confirmada_con_gasto
    check ((estado = 'confirmada') = (gasto_id is not null)),

  -- El plan tiene que ser del mismo perfil. Igual que en `gastos.cuenta_id`, la
  -- contradicción no se evita con una regla en la API que alguien puede
  -- olvidar.
  constraint ocurrencias_recurrencia_del_mismo_perfil_fkey
    foreign key (user_id, recurrencia_id)
    references public.recurrencias (user_id, id)
);

comment on table public.ocurrencias_recurrentes is
  'Las decisiones ya tomadas sobre una fecha de un plan. Lo que no tiene fila está pendiente: las propuestas se derivan, no se guardan.';
comment on column public.ocurrencias_recurrentes.fecha_prevista is
  'La fecha que el plan proponía, no la del movimiento: confirmar corrigiendo la fecha igual cierra esta propuesta.';

-- Las propuestas pendientes se calculan leyendo todas las decisiones del
-- perfil de una vez, así que el índice que sirve es por perfil.
create index if not exists ocurrencias_user_id_idx
  on public.ocurrencias_recurrentes (user_id);

alter table public.ocurrencias_recurrentes enable row level security;

drop policy if exists "ocurrencias_select_propias" on public.ocurrencias_recurrentes;
drop policy if exists "ocurrencias_insert_propias" on public.ocurrencias_recurrentes;
drop policy if exists "ocurrencias_delete_propias" on public.ocurrencias_recurrentes;

create policy "ocurrencias_select_propias"
  on public.ocurrencias_recurrentes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "ocurrencias_insert_propias"
  on public.ocurrencias_recurrentes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- DELETE sí, y solo para deshacer una omisión: el usuario omitió el arriendo de
-- abril por error y quiere que la propuesta vuelva. No hay UPDATE, porque
-- cambiar una decisión de 'omitida' a 'confirmada' sin crear el movimiento es
-- escribir una fila que miente; deshacer y volver a confirmar pasa por la
-- función y no puede quedar a medias.
create policy "ocurrencias_delete_propias"
  on public.ocurrencias_recurrentes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ── La propuesta vuelve si se borra el movimiento ───────────────────────────
--
-- `gastos` todavía no tenía con qué ser referenciada por el par: el unique es
-- para que la foreign key compuesta pueda exigir que el movimiento sea del
-- mismo perfil que la ocurrencia. `id` ya es único por ser primary key.
alter table public.gastos drop constraint if exists gastos_user_id_id_key;
alter table public.gastos add constraint gastos_user_id_id_key unique (user_id, id);

-- `on delete cascade` acá no borra movimientos: borra **la decisión** cuando el
-- movimiento que la materializaba ya no está. O sea que borrar el movimiento
-- deja la propuesta de esa fecha pendiente otra vez, que es exactamente lo que
-- el usuario quiso decir al borrarlo. Sin el cascade quedaría una fila
-- 'confirmada' apuntando a un movimiento inexistente —y el check de arriba
-- obligaría a inventar algo— o la propuesta no volvería nunca y el usuario no
-- tendría forma de recuperarla.
alter table public.ocurrencias_recurrentes
  drop constraint if exists ocurrencias_gasto_del_mismo_perfil_fkey;
alter table public.ocurrencias_recurrentes
  add constraint ocurrencias_gasto_del_mismo_perfil_fkey
  foreign key (user_id, gasto_id)
  references public.gastos (user_id, id)
  on delete cascade;

-- ── Confirmar: las dos escrituras, una transacción ──────────────────────────
--
-- Confirmar inserta en `gastos` y en `ocurrencias_recurrentes`. Hacerlo con dos
-- llamadas desde la API falla de las dos formas posibles y ninguna es
-- aceptable: si primero va el movimiento y la segunda escritura falla, la
-- propuesta sigue pendiente y el siguiente toque crea un movimiento duplicado;
-- si primero va la decisión, un error en el insert del movimiento deja la
-- propuesta cerrada y el movimiento perdido, sin que nada lo diga.
--
-- Dentro de una función plpgsql las dos van en la misma transacción, así que el
-- resultado es uno de los dos: ambas o ninguna. El unique de la ocurrencia es
-- lo que hace que un doble toque sea un error de unicidad y no un movimiento de
-- más.
--
-- `security invoker` (el default, escrito igual para que se lea): la RLS del
-- usuario se aplica, así que un plan que no es suyo simplemente no se
-- encuentra. No hace falta `security definer` porque no hay nada que la sesión
-- no pueda hacer por su cuenta; lo único que agrega la función es la
-- atomicidad. `search_path = ''` obliga a nombres calificados, para que nadie
-- desvíe la función creando un objeto homónimo en otro schema.
--
-- `input_original` del movimiento queda en **null** a propósito: nadie escribió
-- una línea para esta ocurrencia. La línea que escribió la persona está en el
-- plan, y copiarla al movimiento dejaría un texto del que la fecha **no** se
-- puede volver a derivar —la fecha la decidió el generador, no el texto— que es
-- justo lo que las columnas de contexto existen para garantizar. Null no miente
-- y el rastro no se pierde: la fila de `ocurrencias_recurrentes` dice de qué
-- plan salió.

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
returns public.gastos
language plpgsql
security invoker
set search_path = ''
as $$
declare
  plan  public.recurrencias;
  fila  public.gastos;
begin
  select * into plan
    from public.recurrencias r
   where r.id = p_recurrencia_id;

  -- Con la RLS puesta, un plan de otro perfil no se ve: no se distingue de uno
  -- que no existe, y las dos cosas son un 404 para la API.
  if not found then
    raise exception 'No existe esa recurrencia' using errcode = 'no_data_found';
  end if;

  insert into public.gastos (
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
    user_id, recurrencia_id, fecha_prevista, estado, gasto_id
  )
  values (plan.user_id, p_recurrencia_id, p_fecha_prevista, 'confirmada', fila.id);

  return fila;
end;
$$;

-- ── Editar de aquí en adelante ──────────────────────────────────────────────
--
-- Cierra el plan el día anterior a `p_desde` y crea el que sigue, apuntando al
-- cerrado. Lo ya confirmado no se toca nunca, porque son filas de `gastos` y
-- esto no las mira; lo que la cadena protege es lo **pendiente de antes de esa
-- fecha**, que sigue perteneciendo al plan viejo con sus valores viejos.
--
-- Si `p_desde` es anterior o igual al comienzo del plan no hay historia que
-- preservar: no queda ninguna fecha del plan viejo, así que se edita en el
-- lugar y no se deja un plan de vigencia vacía en la lista.
--
-- Las ocurrencias ya decididas siguen colgando del plan viejo, que no se borra.
-- Por eso no hay DELETE sobre `recurrencias`: la cadena es el historial.

create or replace function public.editar_recurrencia_desde(
  p_recurrencia_id   uuid,
  p_desde            date,
  p_monto            integer,
  p_monto_formateado text,
  p_item             text,
  p_categoria        text,
  p_categoria_src    text,
  p_metodo           text,
  p_notas            text,
  p_frecuencia       text,
  p_vigente_hasta    date
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
    notas, frecuencia, vigente_desde, vigente_hasta, input_original, zona,
    hoy_resuelto, plan_anterior_id
  )
  values (
    plan.user_id, p_monto, p_monto_formateado, p_item, p_categoria,
    p_categoria_src, p_metodo, p_notas, p_frecuencia, p_desde, p_vigente_hasta,
    plan.input_original, plan.zona, plan.hoy_resuelto, plan.id
  )
  returning * into nuevo;

  return nuevo;
end;
$$;

-- `delete_user()` no cambia. Borra los movimientos del usuario y después su
-- fila de `auth.users`: el primer paso se lleva por cascade las ocurrencias
-- confirmadas (la foreign key compuesta de arriba) y el segundo las omitidas y
-- los planes (`user_id` con `on delete cascade` en las dos tablas nuevas). El
-- orden que la función ya tiene es el que funciona.
