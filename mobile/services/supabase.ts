import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
// ============================================================================
// MOCK MODE SETUP (DEV/QA ONLY)
// Si esta variable es true, reemplazamos el cliente real de Supabase por un Proxy
// que simula tiempos de carga, magic emails y rate limits sin tocar la BD real.
// Jamás se enviará código mockeado a producción a menos que lo habilites explicitamente.
// ============================================================================
const isMockMode = process.env.EXPO_PUBLIC_USE_MOCKS === 'true'

// Real client
const realSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Magic email states
let mockPendingEmail: string | null = null;

import { mockFeedConfig } from './mockConfig'

// Mocked client wrapper
const mockSupabase = {
  ...realSupabase,
  auth: {
    ...realSupabase.auth,
    signInWithOtp: async ({ email }: { email: string; options?: any }) => {
      console.log(`[Mock Supabase] signInWithOtp called for: ${email}`);
      await new Promise(res => setTimeout(res, 800)); // Simulate delay
      
      if (email.includes('error@')) {
        return { data: null, error: { message: 'Too many requests. Please try again after 30 seconds.' } };
      }
      
      mockPendingEmail = email;
      return { data: {}, error: null };
    },
    verifyOtp: async ({ email, token }: { email: string; token: string; type: string }) => {
      console.log(`[Mock Supabase] verifyOtp called for: ${email} with token: ${token}`);
      await new Promise(res => setTimeout(res, 800)); // Simulate delay
      
      if (email.includes('success@') || token === '123456') {
        mockPendingEmail = null;
        return { data: { session: { access_token: 'mock-token' } }, error: null };
      }
      
      return { data: null, error: { message: 'Token has expired or is invalid' } };
    },
    updateUser: async ({ email }: { email?: string }) => {
      console.log(`[Mock Supabase] updateUser called with email: ${email}`);
      await new Promise(res => setTimeout(res, 800)); // Simulate delay

      if (email?.includes('error@')) {
        return { data: null, error: { message: 'Too many requests. Please try again after 30 seconds.' } };
      }

      if (email) {
        mockPendingEmail = email;
      }
      return { data: {}, error: null };
    },
    getSession: async () => {
      if (isMockMode) return { data: { session: null }, error: null }; // AuthContext handles initial mock session
      return realSupabase.auth.getSession();
    },
    onAuthStateChange: (callback: any) => {
       return realSupabase.auth.onAuthStateChange(callback);
    },
    signOut: async () => {
      console.log('[Mock Supabase] signOut called');
      await new Promise(res => setTimeout(res, 800)); // Simulate delay
      
      // We can use the global mockFeedConfig state here as a proxy for network state
      if (mockFeedConfig.state === 'error') {
         throw new Error('Simulated network error during logout');
      }

      return { error: null };
    }
  }
}

export const supabase = isMockMode ? mockSupabase as any : realSupabase

