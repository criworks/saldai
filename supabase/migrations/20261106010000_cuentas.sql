-- public.cuentas y gastos.cuenta_id: preparar perfil → varias cuentas
--
-- Vocabulario, que acá importa porque las dos palabras se usaban como
-- sinónimos: **perfil** es la cuenta de usuario del sistema (`auth.users`) y
-- **cuenta** es una agrupación de movimientos. Un perfil tiene varias cuentas.
-- No es una billetera: no guarda saldo, no se le suma ni se le resta nada.
--
-- Esta migración **solo prepara el campo**. No hay pantalla de cuentas, la API
-- no recibe ni devuelve una cuenta elegida y ninguna consulta agrupa por ella:
-- lo único que cambia de comportamiento es que cada movimiento nuevo queda
-- colgado de una cuenta en vez de colgar solo del perfil. Se hace ahora porque
-- backfillear 73 filas es gratis y backfillear el histórico de usuarios reales
-- no lo es.
--
-- **`user_id` se queda en la fila de `gastos`, a propósito.** Lo natural sería
-- decir que el dueño del movimiento se deriva de su cuenta, pero eso obligaría
-- a que la política RLS de `gastos` haga un join contra `cuentas` y a que el
-- índice `(user_id, fecha)` —del que depende `totales_por_mes`, la única suma
-- que este proyecto empujó a Postgres— dejara de servir. Es la excepción a
-- "derivar en vez de duplicar", y el precio de no tomarla se paga en cada
-- lectura.
--
-- La contradicción que esa duplicación habilita (un movimiento de un usuario
-- colgado de la cuenta de otro) **no se evita con una regla en la API**, que
-- alguien puede olvidar, sino con la foreign key compuesta del final:
-- `(user_id, cuenta_id)` contra `(user_id, id)` de `cuentas`. Escribir la
-- contradicción pasa a ser imposible.

-- ── La tabla ────────────────────────────────────────────────────────────────

create table if not exists public.cuentas (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  nombre           text not null,

  -- A qué cuenta va un movimiento que no dice ninguna. Es una columna y no una
  -- preferencia del perfil porque la respuesta tiene que estar al lado de las
  -- cuentas: una preferencia que apunte a una cuenta borrada queda apuntando a
  -- la nada, y acá el índice parcial de abajo garantiza que hay exactamente
  -- una.
  es_predeterminada boolean not null default false,

  creado_en        timestamptz not null default now(),

  -- La mitad "padre" de la foreign key compuesta de `gastos`. `id` ya es
  -- único por ser primary key: este unique existe solo para que la FK pueda
  -- referenciar el par y así el usuario del movimiento y el de su cuenta sean
  -- forzosamente el mismo.
  constraint cuentas_user_id_id_key unique (user_id, id)
);

-- Una sola predeterminada por perfil. Parcial porque la restricción es sobre
-- las que lo son: un perfil puede tener muchas cuentas comunes.
create unique index if not exists cuentas_predeterminada_por_perfil_idx
  on public.cuentas (user_id)
  where es_predeterminada;

-- Las cuentas se leen siempre por perfil; nunca por id suelto.
create index if not exists cuentas_user_id_idx
  on public.cuentas (user_id);

comment on table public.cuentas is
  'Agrupaciones de movimientos de un perfil. No es una billetera: no guarda saldo.';
comment on column public.cuentas.es_predeterminada is
  'A qué cuenta va un movimiento que no nombra ninguna. Exactamente una por perfil (índice parcial).';

alter table public.cuentas enable row level security;

-- `drop ... if exists` delante, igual que en las políticas de gastos y de
-- preferencias, para que correr esto dos veces no falle.
drop policy if exists "cuentas_select_propias" on public.cuentas;
drop policy if exists "cuentas_insert_propias" on public.cuentas;
drop policy if exists "cuentas_update_propias" on public.cuentas;

create policy "cuentas_select_propias"
  on public.cuentas
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "cuentas_insert_propias"
  on public.cuentas
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "cuentas_update_propias"
  on public.cuentas
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- **No hay política de DELETE, y la ausencia es la decisión.** Borrar una
-- cuenta pide contestar antes qué pasa con sus movimientos (se borran, pasan a
-- otra, quedan sin cuenta) y eso se decide cuando exista la pantalla. Mientras
-- no esté contestado, la foreign key de abajo tampoco deja borrar una cuenta
-- con movimientos colgando.

-- ── La columna en gastos ────────────────────────────────────────────────────
--
-- Nullable y sin default: la API que está corriendo mientras se aplica esto no
-- la manda, y así sigue insertando sin fallar. El trigger de más abajo es el
-- que la llena.

alter table public.gastos add column if not exists cuenta_id uuid;

comment on column public.gastos.cuenta_id is
  'La cuenta del perfil a la que pertenece el movimiento. La llena el trigger si no viene.';

-- ── La cuenta por defecto nace con el primer movimiento ─────────────────────
--
-- Podría nacer con el perfil, con un trigger sobre `auth.users`, pero entonces
-- harían falta dos caminos de creación —uno para los perfiles que ya existen y
-- otro para los que vengan— y dos lugares donde olvidarse. Con get-or-create en
-- la escritura hay una sola regla, vale para todos y se arregla sola si alguna
-- vez queda un perfil sin cuenta.
--
-- Va en la base y no en la API por la misma razón que la foreign key: una
-- columna que se llena "siempre que el código se acuerde" termina con filas en
-- null, y una fila en null acá no da ningún error, solo deja un movimiento
-- afuera de cualquier vista que agrupe por cuenta.
--
-- `security definer` porque crear la cuenta pasa por encima de la RLS de
-- `cuentas` (el `insert` ocurre dentro de la transacción de quien escribe el
-- movimiento, que todavía no tiene cuenta que ver), y `search_path = ''`
-- obliga a nombres calificados, para que nadie pueda desviar la función
-- creando un objeto con el mismo nombre en otro schema. Usa `new.user_id` y no
-- `auth.uid()`: la cuenta tiene que ser la del dueño de la fila, que es lo que
-- la política de INSERT de `gastos` ya obliga a que coincida con la sesión.

create or replace function public.asignar_cuenta_predeterminada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_cuenta uuid;
begin
  -- Si el movimiento ya dice de qué cuenta es, no se toca: la foreign key
  -- compuesta ya garantizó que esa cuenta es del mismo perfil.
  if new.cuenta_id is not null then
    return new;
  end if;

  select c.id into id_cuenta
    from public.cuentas c
   where c.user_id = new.user_id
     and c.es_predeterminada;

  if id_cuenta is null then
    insert into public.cuentas (user_id, nombre, es_predeterminada)
    values (new.user_id, 'Principal', true)
    on conflict do nothing
    returning id into id_cuenta;

    -- Dos movimientos del mismo perfil a la vez: el segundo insert choca con
    -- el índice parcial, `do nothing` lo descarta y no devuelve nada. La
    -- cuenta existe igual, así que hay que volver a leerla.
    if id_cuenta is null then
      select c.id into id_cuenta
        from public.cuentas c
       where c.user_id = new.user_id
         and c.es_predeterminada;
    end if;
  end if;

  new.cuenta_id := id_cuenta;
  return new;
end;
$$;

revoke all on function public.asignar_cuenta_predeterminada() from public;
revoke all on function public.asignar_cuenta_predeterminada() from anon;
revoke all on function public.asignar_cuenta_predeterminada() from authenticated;

drop trigger if exists gastos_asignar_cuenta on public.gastos;
create trigger gastos_asignar_cuenta
  before insert on public.gastos
  for each row
  execute function public.asignar_cuenta_predeterminada();

-- ── Backfill ───────────────────────────────────────────────────────────────
--
-- Hace con lo que ya está escrito exactamente lo que el trigger hará de ahora
-- en adelante: una cuenta "Principal" por perfil que tenga movimientos, y
-- todos sus movimientos colgados de ella. Un perfil sin movimientos no recibe
-- cuenta todavía; la va a crear su primer movimiento, igual que uno nuevo.

-- El `exists` contra `auth.users` no es decorativo: `gastos.user_id` no tiene
-- foreign key (por eso `delete_user()` borra los movimientos a mano), así que
-- un perfil borrado por fuera de esa función pudo dejar movimientos huérfanos.
-- Sin el filtro, esos movimientos harían fallar la migración entera al crear
-- su cuenta, y quedarían sin cuenta igual.
insert into public.cuentas (user_id, nombre, es_predeterminada)
select distinct g.user_id, 'Principal', true
  from public.gastos g
 where exists (select 1 from auth.users u where u.id = g.user_id)
on conflict do nothing;

update public.gastos g
   set cuenta_id = c.id
  from public.cuentas c
 where c.user_id = g.user_id
   and c.es_predeterminada
   and g.cuenta_id is null;

-- ── La integridad, al final ─────────────────────────────────────────────────
--
-- Se agrega después del backfill para que Postgres valide las filas que ya
-- están en vez de darlas por buenas.
--
-- `MATCH SIMPLE` (el default) no evalúa la restricción cuando alguna de las
-- columnas es null, así que una fila con `cuenta_id` en null sigue siendo
-- escribible. Eso es lo que mantiene la migración aditiva: el día que algo
-- escriba un movimiento sin pasar por el trigger, la fila entra y queda
-- visible como "sin cuenta" en vez de hacer fallar la escritura. El `not null`
-- va cuando la cuenta sea obligatoria en la UI, y eso ya no es aditivo.
--
-- Sin `on delete cascade` ni `set null` a propósito: borrar una cuenta con
-- movimientos tiene que fallar mientras nadie haya decidido qué pasa con
-- ellos. Un cascade acá borra gastos del usuario sin que nadie lo haya pedido.

alter table public.gastos drop constraint if exists gastos_cuenta_del_mismo_perfil_fkey;
alter table public.gastos
  add constraint gastos_cuenta_del_mismo_perfil_fkey
  foreign key (user_id, cuenta_id)
  references public.cuentas (user_id, id);

-- `delete_user()` no cambia: borra los movimientos del usuario y después la
-- fila de `auth.users`, y la foreign key con `on delete cascade` de
-- `cuentas.user_id` se lleva las cuentas. Como los movimientos ya se fueron,
-- la foreign key de arriba no tiene nada que frenar. El orden importa y es el
-- que la función ya tiene.
