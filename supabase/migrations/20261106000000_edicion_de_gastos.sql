-- public.gastos: notas del usuario y marca de edición manual
--
-- Las políticas de UPDATE y DELETE ya existen (ver
-- `20261027000100_rls_gastos.sql`); lo que faltaba era dónde guardar las notas
-- y, sobre todo, **qué campos tocó el usuario a mano**.
--
-- Por qué la marca: los campos derivados de un movimiento (hoy la categoría,
-- que sale del catálogo del parser) se pueden volver a derivar desde
-- `input_original`, y el replay sobre los 73 movimientos de producción mostró
-- que para los cinco campos que no son `fecha` eso reconstruye 73/73. O sea
-- que re-categorizar el histórico es seguro... salvo en las filas donde el
-- usuario ya corrigió la categoría él mismo. Sin esta marca, el primer
-- reclasificar masivo le pisa esa corrección y no hay forma de distinguir
-- "quedó así porque el parser la puso" de "quedó así porque la arreglé".
--
-- Es un arreglo de nombres de campo y no un booleano por la misma razón que las
-- preferencias llevan dos columnas por flag: con un `editado boolean`, alguien
-- que corrigió solo el monto queda también excluido de un reclasificar que no
-- tiene nada que ver con lo que él cambió. La pregunta que hay que poder
-- contestar es por campo, así que el dato es por campo.
--
-- Aditiva: `notas` y `editado_en` son nullable y `campos_editados` tiene
-- default, así que la API anterior sigue insertando sin ellas mientras el
-- deploy no haya terminado.

alter table public.gastos add column if not exists notas           text;
alter table public.gastos add column if not exists editado_en      timestamptz;
alter table public.gastos
  add column if not exists campos_editados text[] not null default '{}'::text[];

comment on column public.gastos.notas is
  'Detalle libre que escribe el usuario. No lo lee el parser.';
comment on column public.gastos.editado_en is
  'Cuándo se editó a mano por última vez. Null = nunca se editó.';
comment on column public.gastos.campos_editados is
  'Los campos que el usuario corrigió a mano. Un reclasificar masivo tiene que saltearse los que estén acá.';
