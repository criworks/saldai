-- Un flag más en public.preferencias: recurrencias
--
-- La migración de `preferencias` dejó escrito que agregar un flag es "una
-- migración aditiva de dos líneas". Esta es esa migración.
--
-- Igual que los otros dos, van dos columnas y no una: `habilitado` es lo que
-- decide el plan y `activo` lo que decide el usuario. Con un solo campo, el día
-- que haya un plan pago no se distingue "apagado porque lo apagó" de "apagado
-- porque no pagó", y esa diferencia no se recupera después.
--
-- `habilitado` nace en true, como los otros: hoy no hay nada que cobrar.
--
-- `activo` nace en **true** y acá sí se separa de los otros dos. Categorías y
-- métodos de pago nacieron apagados porque eran funciones que la v1 todavía no
-- mostraba. Las recurrencias ya están en la app y el usuario las está usando:
-- un default en false se las apagaría a quien ya tiene planes creados, y la
-- primera señal sería que dejan de aparecerle las propuestas por confirmar.

alter table public.preferencias
  add column if not exists recurrencias_habilitado boolean not null default true,
  add column if not exists recurrencias_activo     boolean not null default true;

comment on column public.preferencias.recurrencias_habilitado is
  'Si el perfil puede usar recurrencias (entitlement). Separado de `activo` para que un plan pago no se confunda con una preferencia.';
comment on column public.preferencias.recurrencias_activo is
  'Si el usuario quiere las recurrencias (preferencia). Nace en true porque la función ya estaba en uso cuando se agregó el flag.';
