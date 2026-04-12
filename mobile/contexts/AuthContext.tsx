import { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  triggerMockSession?: () => void
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  signOut: async () => {},
})

// ============================================================================
// MOCK MODE SETUP (DEV/QA ONLY)
// ============================================================================
const isMockMode = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

const mockSession: Session = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: {
    id: 'mock-user-id',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: 'test@mock.com',
    phone: '',
  },
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isMockMode) {
      console.log('🚧 Running in MOCK MODE (Auth)');
      // Do not auto-login in mock mode to allow testing the login flow
      setLoading(false);
      
      // We still listen to auth state changes so that when our mock verifyOtp 
      // succeeds (and potentially calls a callback), we could handle it.
      // However, mock verifyOtp doesn't trigger onAuthStateChange automatically, 
      // so we might need a manual trigger or just set session.
      // For simplicity in mock mode, if we are here, we let the UI handle the state.
      return;
    }

    // Sesión activa al abrir la app
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // Escucha cambios: login, logout, refresh
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    if (isMockMode) {
      // Simulate the network call using our mockSupabase
      await supabase.auth.signOut();
      setSession(null);
      return;
    }
    await supabase.auth.signOut()
  }

  const triggerMockSession = () => {
    if (isMockMode) {
      setSession(mockSession);
    }
  }

  return (
    <AuthContext.Provider value={{ session, loading, signOut, triggerMockSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
