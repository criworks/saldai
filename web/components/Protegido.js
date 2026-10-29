'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from './AuthProvider'

/**
 * Envuelve una página que necesita sesión. Sin sesión redirige al login, así la
 * página no alcanza a hacer fetch y recibir un 401.
 */
export default function Protegido({ children }) {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) router.replace('/login')
  }, [loading, session, router])

  if (loading || !session) {
    return (
      <main className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <p className="text-[#333] text-xs tracking-widest">cargando...</p>
      </main>
    )
  }

  return children
}
