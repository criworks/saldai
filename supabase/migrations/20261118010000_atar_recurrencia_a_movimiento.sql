-- Configurar la recurrencia desde el movimiento
--
-- Hasta acá un plan se creaba escribiendo su propia línea, sin relación con
-- ningún movimiento. Los diseños piden lo contrario: registro un movimiento, le
-- digo que es recurrente, y de ahí en adelante se propone solo. Y lo mismo
-- sobre un movimiento que ya existe, de cualquier fecha.
--
-- El movimiento que ancla el plan **no se vuelve a proponer**: queda escrito
-- como su primera ocurrencia, ya confirmada. Sin eso, el plan propondría la
-- fecha que la persona acaba de registrar y el primer pendiente sería un
-- duplicado de lo que tiene a la vista.
--
-- Las ocurrencias **entre esa fecha y hoy** sí se proponen, y es a propósito:
-- marcar como recurrente el arriendo de hace tres meses deja esos tres meses
-- por confirmar. El usuario decide uno por uno, mirando si ya los tenía
-- cargados a mano. Saldai informa y no cuadra sola.

-- ── Atar un plan a un movimiento ────────────────────────────────────────────
--
-- Son dos escrituras —el plan y la decisión sobre su primera fecha— y a medias
-- dejan un plan que propone la fecha del movimiento que lo originó, o sea un
-- duplicado esperando. Por eso van en una función, igual que confirmar.
--
-- `security invoker` y `search_path = ''` por lo mismo que las otras: la RLS
-- del usuario se aplica, así que un movimiento que no es suyo no se encuentra,
-- y la función no puede ser desviada por un objeto homónimo en otro schema.
--
-- `input_original` del plan queda en **null**: nadie escribió una línea para
-- este plan. Copiarle la del movimiento sería peor que no tener nada, porque
-- esa línea puede haber sido corregida a mano después (`campos_editados`) y
-- entonces ya no deriva los valores que el plan va a proponer. El rastro no se
-- pierde: la ocurrencia dice de qué movimiento salió.
--
-- Si el movimiento ya está atado a un plan, el unique parcial sobre
-- `movimiento_id` corta con `unique_violation`, y la API lo traduce a un 409.
-- Es la misma idea que el doble toque en confirmar: lo impide la base y no una
-- comprobación previa que una carrera puede saltarse.

create or replace function public.atar_recurrencia_a_movimiento(
  p_movimiento_id uuid,
  p_frecuencia    text,
  p_vigente_hasta date
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

  -- Con la RLS puesta, un movimiento de otro perfil no se ve: no se distingue
  -- de uno que no existe, y las dos cosas son un 404 para la API.
  if not found then
    raise exception 'No existe ese movimiento' using errcode = 'no_data_found';
  end if;

  insert into public.recurrencias (
    user_id, monto, monto_formateado, item, categoria, categoria_src, metodo,
    notas, frecuencia, vigente_desde, vigente_hasta, zona
  )
  values (
    mov.user_id, mov.monto, mov.monto_formateado, mov.item, mov.categoria,
    mov.categoria_src, mov.metodo, mov.notas, p_frecuencia,
    -- El ancla es la fecha del movimiento: es lo que conserva el día del mes.
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

-- ── Crear el movimiento y su plan de una ────────────────────────────────────
--
-- El alta con recurrencia no puede ser dos llamadas desde la API: si la segunda
-- falla queda un movimiento que la persona ve registrado pero que no es
-- recurrente, sin que nada lo diga, y el error llega después de que la pantalla
-- ya se cerró. Acá las tres escrituras son una transacción.
--
-- Toma las mismas columnas que el insert de siempre y delega el resto, para que
-- la regla de "el movimiento que ancla queda confirmado" esté escrita una sola
-- vez. Devuelve la fila de la vista y no la de la tabla porque la app, apenas
-- creado, tiene que poder mostrar el movimiento como recurrente: así el alta
-- responde lo mismo que después devuelve la lectura del mes.

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

  perform public.atar_recurrencia_a_movimiento(fila.id, p_frecuencia, p_vigente_hasta);

  select * into final
    from public.movimientos_con_recurrencia v
   where v.id = fila.id;

  return final;
end;
$$;
