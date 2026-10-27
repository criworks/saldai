const { createClient } = require('@supabase/supabase-js')

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Faltan variables de entorno requeridas: SUPABASE_URL y SUPABASE_ANON_KEY')
}

const createSupabaseClient = (userJwt) => {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${userJwt}` }
    }
  })
}

// Cliente sin sesión de usuario. Solo para el health check: con RLS activo no
// devuelve filas, pero sí confirma que la base responde.
const createAnonClient = () => {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
}

module.exports = { createSupabaseClient, createAnonClient }
