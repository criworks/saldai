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

module.exports = { createSupabaseClient }
