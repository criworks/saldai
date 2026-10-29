'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '../../components/AuthProvider'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const { session, loading: cargandoSesion } = useAuth()
  const router = useRouter()

  // 'email' pide el correo, 'codigo' pide los 6 dígitos que llegaron por mail.
  const [paso, setPaso] = useState('email')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!cargandoSesion && session) router.replace('/')
  }, [cargandoSesion, session, router])

  async function pedirCodigo(e) {
    e?.preventDefault()
    if (!email.trim() || enviando) return

    setEnviando(true)
    setError(null)

    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })

    setEnviando(false)

    if (err) {
      setError(err.message)
      return
    }

    setPaso('codigo')
  }

  async function verificar(e) {
    e?.preventDefault()
    if (codigo.length !== 6 || enviando) return

    setEnviando(true)
    setError(null)

    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: codigo,
      type: 'email',
    })

    setEnviando(false)

    if (err) {
      setError(err.message)
      setCodigo('')
      return
    }

    // El redirect lo hace el efecto de arriba cuando entra la sesión.
  }

  function volver() {
    setPaso('email')
    setCodigo('')
    setError(null)
  }

  return (
    <main className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center px-6">
      <div className="mb-16 text-center">
        <p className="text-[#444] text-xs tracking-[0.3em] uppercase mb-2">saldai</p>
        <div className="w-6 h-px bg-[#333] mx-auto" />
      </div>

      {paso === 'email' ? (
        <form onSubmit={pedirCodigo} className="flex flex-col items-center">
          <input
            type="email"
            value={email}
            placeholder="tu correo"
            autoFocus
            autoComplete="email"
            onChange={e => setEmail(e.target.value)}
            className="
              bg-transparent border-none outline-none text-center
              text-[#e8e8e8] placeholder-[#2a2a2a]
              text-2xl font-light tracking-wide
              border-b border-[#222] focus:border-[#555]
              transition-colors duration-200 w-72
            "
          />
          <button
            type="submit"
            disabled={!email.trim() || enviando}
            className={`
              mt-10 px-8 py-2 text-xs tracking-[0.25em] uppercase
              border transition-all duration-300
              ${
                email.trim() && !enviando
                  ? 'border-[#333] text-[#888] hover:border-[#666] hover:text-[#e8e8e8]'
                  : 'border-[#1a1a1a] text-[#2a2a2a] cursor-not-allowed'
              }
            `}
          >
            {enviando ? 'enviando...' : 'enviar código'}
          </button>
        </form>
      ) : (
        <form onSubmit={verificar} className="flex flex-col items-center">
          <p className="text-[#444] text-xs tracking-widest uppercase mb-8 text-center">
            te enviamos un código a {email}
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={codigo}
            placeholder="······"
            autoFocus
            onChange={e => setCodigo(e.target.value.replace(/\D/g, ''))}
            className="
              bg-transparent border-none outline-none text-center
              text-[#e8e8e8] placeholder-[#2a2a2a]
              text-3xl font-light tracking-[0.4em]
              border-b border-[#222] focus:border-[#555]
              transition-colors duration-200 w-56
            "
          />
          <button
            type="submit"
            disabled={codigo.length !== 6 || enviando}
            className={`
              mt-10 px-8 py-2 text-xs tracking-[0.25em] uppercase
              border transition-all duration-300
              ${
                codigo.length === 6 && !enviando
                  ? 'border-[#333] text-[#888] hover:border-[#666] hover:text-[#e8e8e8]'
                  : 'border-[#1a1a1a] text-[#2a2a2a] cursor-not-allowed'
              }
            `}
          >
            {enviando ? 'verificando...' : 'entrar'}
          </button>
          <button
            type="button"
            onClick={volver}
            className="mt-6 text-[#333] text-xs tracking-widest uppercase hover:text-[#666] transition-colors"
          >
            usar otro correo
          </button>
        </form>
      )}

      {error && (
        <p className="mt-10 text-[#663333] text-xs tracking-widest uppercase text-center max-w-xs">
          {error}
        </p>
      )}
    </main>
  )
}
