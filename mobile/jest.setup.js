// Los tests no hablan con la red ni con Supabase: cada uno declara qué
// devuelve la API de gastos para el caso que está probando.
jest.mock('./features/gastos/api')

// `services/supabase` crea el cliente al importarse y pide las variables de
// entorno, que en los tests no existen.
jest.mock('./services/supabase', () => ({ supabase: {} }))

// `react-native-keyboard-controller` tiene código nativo: fuera del celular
// hay que usar el mock que trae la propia librería.
jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest')
)
