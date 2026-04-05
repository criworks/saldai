import { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  signOut: async () => {},
})

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
      // Simulate network delay
      const timer = setTimeout(() => {
        setSession(mockSession)
        setLoading(false)
      }, 500)
      return () => clearTimeout(timer)
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
      setSession(null);
      return;
    }
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
