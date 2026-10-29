import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Mismo proyecto de Supabase que usa mobile. La única diferencia es el storage:
// mobile guarda la sesión en SecureStore, el browser la guarda en localStorage,
// que es el default del cliente.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // El login es con código de 6 dígitos, no con magic link, así que no hay
    // tokens que leer desde la URL.
    detectSessionInUrl: false,
  },
})
