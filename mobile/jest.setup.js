// Los tests no hablan con la red ni con Supabase: cada uno declara qué
// devuelve `services/api` para el caso que está probando.
jest.mock('./services/api')

// `services/supabase` crea el cliente al importarse y pide las variables de
// entorno, que en los tests no existen.
jest.mock('./services/supabase', () => ({ supabase: {} }))
