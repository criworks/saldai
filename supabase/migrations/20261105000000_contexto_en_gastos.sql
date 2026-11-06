-- public.gastos: la zona y el día con los que se resolvió la fecha
--
-- El parser resuelve "hoy", "ayer" y "lunes" contra un día de referencia, y ese
-- día depende de una zona horaria. Hasta ahora no se guardaba ninguno de los
-- dos, así que la fecha de un movimiento no se podía volver a derivar desde su
-- `input_original`: al re-correr el parser sobre los 73 movimientos de
-- producción, 45 (62%) salían con otra fecha, porque "ayer" pasaba a ser el
-- ayer de hoy.
--
-- Guardarlos también arregla un problema de producto: `useGastoMutation` no le
-- pasaba zona al parser y la API usaba `APP_TIMEZONE`, así que las dos puntas
-- asumían Chile y un usuario en otra zona registraba con el día de Chile.
--
-- Las dos columnas son nullable y la migración es aditiva: la API vieja sigue
-- insertando sin ellas mientras el deploy no haya terminado.

alter table public.gastos add column if not exists zona          text;
alter table public.gastos add column if not exists hoy_resuelto  date;

comment on column public.gastos.zona is
  'Zona IANA con la que se resolvió la fecha. Se congela: cambiar de zona no mueve lo ya registrado.';
comment on column public.gastos.hoy_resuelto is
  'El día que el parser usó como "hoy". Con `input_original` y esto, la fecha se puede volver a derivar.';

-- Backfill de lo que ya existe. Hasta hoy todo se registró asumiendo Chile, así
-- que la zona es esa y el día de referencia es el día civil chileno de
-- `creado_en`.
--
-- Nota: el backfill no tapa el error que encontró el replay, lo deja a la vista.
-- La fila "arriendo abril" (525.457) tiene `fecha` 2026-04-03, pero su
-- `hoy_resuelto` va a quedar en 2026-04-03 y su input dice "Ayer", o sea 04-02:
-- se creó 2026-04-04T02:48Z, cuando en Chile era todavía el 3, y se resolvió
-- con el día UTC. `hoyCivil(zona)` entró recién el 2026-10-29. La corrección de
-- esa fila va aparte, porque es un cambio de datos y no de esquema.

update public.gastos
   set zona         = 'America/Santiago',
       hoy_resuelto = (creado_en at time zone 'America/Santiago')::date
 where zona is null
    or hoy_resuelto is null;
