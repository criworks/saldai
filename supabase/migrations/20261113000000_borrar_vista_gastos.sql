-- Se va la vista de compatibilidad public.gastos
--
-- La dejó `20261112000000_renombrar_gastos_a_movimientos.sql` para tapar un
-- hueco de minutos: las migraciones las aplica una persona a mano y el deploy
-- de Render sale solo al mergear a `main`, así que entre uno y otro había una
-- API que nombraba `gastos` contra una base que ya no la tenía. Ese hueco se
-- cerró con el release del 12-nov. Del lado de la aplicación nada más la lee:
-- la API consulta `movimientos` —`api/src/movimientos/repositorio.js` y
-- `api/src/rutas/salud.js`— y mobile no le habla a Supabase para leer ni
-- escribir, solo a la API.
--
-- ⚠️ **Lo que sí la lee vive fuera del repo: el keep-alive de Supabase.** El
-- cron de cron-job.org que mantiene despierto el proyecto le pega justo a esta
-- vista, `GET /rest/v1/gastos?select=id&limit=1`, todos los días a las 09:00
-- UTC —medido en los logs del proyecto el 13-nov-2026, status 200—. Hay que
-- cambiarlo a `/rest/v1/movimientos?select=id&limit=1` **antes** de aplicar
-- esto. Si no, el cron empieza a fallar y **no lo dice nadie**: el síntoma
-- aparece siete días después, con el proyecto pausado por inactividad y la app
-- sin base. Es la misma trampa que ya estaba anotada para el header `apikey`.
--
-- Conviene que la vista no sobreviva a su motivo: mientras esté, una escritura
-- que no pase por la API puede entrar por acá, y es un nombre más que mantener
-- en cada migración que toque la tabla. Si alguna vez hiciera falta de vuelta,
-- el `create or replace view` de la migración del renombre la reconstruye en
-- una línea.
--
-- Respecto del deploy de la API no hay orden que respetar. Lo que todavía
-- responde al nombre viejo es la ruta HTTP `/gastos`, y esa lee la tabla, no la
-- vista: aplicar esto con la API vieja arriba no rompe nada. La ruta se saca en
-- el mismo PR que esta migración, y eso sí necesita el release.

drop view if exists public.gastos;

-- PostgREST cachea el schema, igual que cuando la vista se creó.
notify pgrst, 'reload schema';
