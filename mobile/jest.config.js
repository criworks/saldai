/**
 * Tests de mobile.
 *
 * `jest-expo` ya trae la transformación de Babel y los mocks de los módulos
 * nativos de Expo y React Native, que es lo que hace falta para que un hook o
 * un componente se puedan montar fuera del celular.
 *
 * Los tests viven al lado de lo que prueban, en `__tests__`.
 */
module.exports = {
  preset: 'jest-expo',
  // El default de jest-expo ignora node_modules, pero el monorepo tiene los
  // paquetes de Expo y react-query en ESM y hay que transformarlos.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|nativewind|react-native-css-interop|native-base|react-native-svg|@tanstack/.*)',
  ],
  // El alias `@/` de tsconfig.json lo resuelve Metro en el bundle, pero Jest
  // no lee tsconfig: hay que repetirlo acá o los imports absolutos no cargan.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
}
