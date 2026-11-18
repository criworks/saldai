-- El movimiento dice de qué plan nace
--
-- El vínculo entre un movimiento y su recurrencia existe desde el PR #86, pero
-- en una sola dirección: `ocurrencias_recurrentes.movimiento_id` apunta al
-- movimiento y el movimiento no apunta a nada. Alcanzaba mientras la
-- recurrencia se configuraba solo en su propia pantalla; no alcanza ahora, que
-- el movimiento tiene que mostrar si es recurrente.
--
-- Leerlo desde la app cruzando las dos listas sería N+1 consultas para pintar
-- un ícono, y además la app tendría que repetir una regla que es de la base.
-- Por eso la lectura se resuelve acá, en una vista.

-- ── Una ocurrencia por movimiento ───────────────────────────────────────────
--
-- Sin esto, nada impide que dos planes digan haber creado el mismo movimiento,
-- y entonces la vista de abajo devolvería ese movimiento **dos veces**: el mes
-- sumaría de más sin que ninguna fila esté mal. Es la misma razón por la que
-- las decisiones ya llevan un unique por fecha.
--
-- Parcial porque las omitidas no tienen movimiento, y en Postgres los nulls no
-- chocan entre sí en un unique, pero dejarlo escrito dice cuál es la regla.
create unique index if not exists ocurrencias_movimiento_unico
  on public.ocurrencias_recurrentes (movimiento_id)
  where movimiento_id is not null;

-- ── La vista que lee la API ─────────────────────────────────────────────────
--
-- `security_invoker` hace que la RLS que corra sea la del usuario que consulta
-- y no la del dueño de la vista. Sin eso una vista sobre dos tablas con RLS es
-- un agujero que deja ver los movimientos de todos: ya pasó en este repo con
-- la vista de compatibilidad `public.gastos`, y por eso se escribe explícito.
--
-- Es solo de lectura: escribir sigue siendo contra `public.movimientos`. La
-- vista existe para que `GET /movimientos` siga siendo una consulta, con sus
-- filtros de mes y de categoría intactos.
create or replace view public.movimientos_con_recurrencia
with (security_invoker = true)
as select
    m.*,
    -- Null en un movimiento que nadie ató a un plan. Un movimiento nacido de
    -- confirmar una propuesta ya lo trae, sin migrar nada.
    o.recurrencia_id
  from public.movimientos m
  left join public.ocurrencias_recurrentes o
    on o.movimiento_id = m.id
   and o.user_id = m.user_id;

comment on view public.movimientos_con_recurrencia is
  'Los movimientos con el plan del que nacen, si nacen de uno. Solo lectura: escribir es contra public.movimientos.';

grant select on public.movimientos_con_recurrencia to authenticated;
