-- Baseline: estado de public.gastos antes de esta carpeta
--
-- La tabla se creó a mano desde el dashboard y el proyecto no tenía ninguna
-- migración registrada, así que no había forma de reconstruir la base en otro
-- ambiente. Esta migración deja por escrito el estado actual, sin cambiarlo:
-- es idempotente a propósito, para que correrla sobre el proyecto que ya
-- existe no haga nada.
--
-- Nota: `fecha` es text (formato DD/MM/AAAA) y no date. Es lo que hay hoy y
-- esta migración no lo toca; el cambio a date va aparte, porque obliga a
-- migrar los datos y a tocar la API.

create table if not exists public.gastos (
  id               uuid primary key default gen_random_uuid(),
  monto            integer not null,
  monto_formateado text,
  item             text not null,
  categoria        text,
  categoria_src    text,
  metodo           text,
  fecha            text,
  input_original   text,
  creado_en        timestamptz default now(),
  user_id          uuid not null
);

alter table public.gastos enable row level security;
