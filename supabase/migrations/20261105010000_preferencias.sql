-- public.preferencias: las preferencias del perfil
--
-- Hasta ahora las dos que existen —si se ven las categorías y si se ve el
-- selector de método de pago— eran constantes en `mobile/lib/funciones.ts`.
-- Horneadas en el bundle: iguales para todos los usuarios, y cambiarlas pide
-- un build y una versión nueva en las stores. Para prenderle categorías a un
-- usuario y no a otro hace falta guardarlas por perfil.
--
-- No va en el dispositivo (`AsyncStorage`) porque una preferencia que se
-- pierde al reinstalar y no viaja a otro teléfono no es una preferencia del
-- usuario, es una del aparato.
--
-- **Dos campos por flag, no uno.** `habilitado` es si el perfil *puede* usar la
-- función y `activo` es si *quiere* usarla. Con un solo campo, el día que haya
-- un plan pago no se distingue "apagado porque el usuario lo apagó" de
-- "apagado porque no pagó", y esa diferencia no se recupera después: al cobrar
-- habría que elegir entre prenderle la función a todo el mundo o apagársela a
-- quien ya la estaba usando. Hoy no hay nada que cobrar, así que `habilitado`
-- nace en true para todos.
--
-- Son columnas y no filas de clave/valor porque el juego de flags es chico y
-- conocido, y así cada uno tiene su tipo y su default en el schema en vez de
-- depender de que la app interprete bien una fila que falta. Agregar un flag
-- más adelante es una migración aditiva de dos líneas, que es lo barato en
-- este repo.

create table if not exists public.preferencias (
  user_id                uuid primary key references auth.users (id) on delete cascade,

  -- Las categorías y los métodos de pago arrancan apagados, que es cómo sale
  -- la v1: el usuario los prende si los quiere.
  categorias_habilitado  boolean     not null default true,
  categorias_activo      boolean     not null default false,
  metodos_habilitado     boolean     not null default true,
  metodos_activo         boolean     not null default false,

  -- Zona IANA elegida por el usuario. En null, la app usa la del dispositivo,
  -- que es lo que ya hace desde que existe `mobile/lib/zona.ts`. Así el select
  -- de zona es puramente aditivo: no cambia el comportamiento de quien no lo
  -- toque.
  zona                   text,

  creado_en              timestamptz not null default now(),
  actualizado_en         timestamptz not null default now()
);

comment on table public.preferencias is
  'Preferencias por perfil. Una fila por usuario, creada al primer guardado: si no hay fila, valen los defaults de estas columnas.';
comment on column public.preferencias.categorias_habilitado is
  'Si el perfil puede usar categorías (entitlement). Separado de `activo` para que un plan pago no se confunda con una preferencia.';
comment on column public.preferencias.categorias_activo is
  'Si el usuario quiere ver las categorías (preferencia).';
comment on column public.preferencias.zona is
  'Zona IANA elegida. En null se usa la del dispositivo.';

-- No hace falta tocar `delete_user()`: la foreign key con `on delete cascade`
-- se lleva la fila cuando se borra el usuario de `auth.users`. Es una garantía
-- de la base y no una línea que alguien pueda olvidar de actualizar. `gastos`
-- no tiene esa foreign key, por eso `delete_user()` sí las borra a mano.

alter table public.preferencias enable row level security;

-- Con `drop ... if exists` delante, igual que en la migración de RLS de gastos,
-- correr esto dos veces no falla.
drop policy if exists "preferencias_select_propias" on public.preferencias;
drop policy if exists "preferencias_insert_propias" on public.preferencias;
drop policy if exists "preferencias_update_propias" on public.preferencias;

create policy "preferencias_select_propias"
  on public.preferencias
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "preferencias_insert_propias"
  on public.preferencias
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "preferencias_update_propias"
  on public.preferencias
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
