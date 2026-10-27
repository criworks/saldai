-- Índice de public.gastos
--
-- La tabla solo tenía el índice de la primary key (id), pero ninguna consulta
-- de la app busca por id: todas filtran por user_id y ordenan por fecha de
-- creación. Con pocas filas Postgres hace un scan completo y no se nota, pero
-- crece de forma lineal con el total de gastos de todos los usuarios.
--
-- El índice es compuesto porque sirve a las dos cosas a la vez: filtrar por
-- usuario y devolver lo más reciente primero sin ordenar aparte.

create index if not exists gastos_user_id_creado_en_idx
  on public.gastos (user_id, creado_en desc);
