-- public.delete_user()
--
-- La pantalla de configuraciones de mobile llama `supabase.rpc('delete_user')`
-- para que el usuario borre su cuenta, pero la función nunca existió: la app
-- recibía un error, lo registraba con console.warn y seguía como si nada, así
-- que la cuenta quedaba viva.
--
-- Va como `security definer` porque borrar de auth.users no es algo que el rol
-- `authenticated` pueda hacer por sí mismo. El riesgo de eso se acota así:
--   - `search_path = ''` obliga a nombres calificados, para que nadie pueda
--     desviar la función creando un objeto con el mismo nombre en otro schema.
--   - Solo borra las filas del usuario de la sesión, nunca recibe un id por
--     parámetro.
--   - El execute se revoca de `public` y `anon`, y se otorga solo a
--     `authenticated`.

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_usuario uuid := auth.uid();
begin
  if id_usuario is null then
    raise exception 'No hay sesión activa';
  end if;

  delete from public.gastos where user_id = id_usuario;
  delete from auth.users where id = id_usuario;
end;
$$;

revoke all on function public.delete_user() from public;
revoke all on function public.delete_user() from anon;
grant execute on function public.delete_user() to authenticated;
