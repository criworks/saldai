// ============================================================================
// MOCK CONTROLS (DEV/QA ONLY)
// Este objeto permite mutar el estado global de los datos simulados desde
// el UI Playground para testear casos como "Lista vacía" o "Errores".
// Al igual que isMockMode, no afecta en producción.
// ============================================================================
export const mockFeedConfig = {
  state: 'normal' as 'normal' | 'empty' | 'huge' | 'error' | 'loading'
};
