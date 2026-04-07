'use client'

import { useRef, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL

const CAMPOS = [
  { key: 'monto', placeholder: 'monto', type: 'text', width: 'w-28' },
  { key: 'item', placeholder: 'qué', type: 'text', width: 'w-40' },
  { key: 'categoria', placeholder: 'categoría', type: 'text', width: 'w-36' },
  { key: 'fecha', placeholder: 'cuándo', type: 'text', width: 'w-28' },
]

export default function Home() {
  const [valores, setValores] = useState({ monto: '', item: '', categoria: '', fecha: '' })
  const [metodo, setMetodo] = useState('TC')
  const [estado, setEstado] = useState('idle') // idle | loading | ok | error
  const [resultado, setResultado] = useState(null)
  const refs = useRef({})

  function buildInput() {
    const partes = [valores.monto, valores.item, valores.categoria, valores.fecha, metodo]
    return partes.join(', ')
  }

  function handleChange(key, val) {
    setValores(prev => ({ ...prev, [key]: val }))
  }

  function handleKeyDown(e, key) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const keys = CAMPOS.map(c => c.key)
      const idx = keys.indexOf(key)
      if (idx < keys.length - 1) {
        refs.current[keys[idx + 1]]?.focus()
      } else {
        handleSubmit()
      }
    }
  }

  async function handleSubmit() {
    if (!valores.monto || !valores.item) return

    setEstado('loading')
    setResultado(null)

    try {
      const res = await fetch(`${API_URL}/gastos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: buildInput() }),
      })
      const json = await res.json()

      if (json.ok) {
        setEstado('ok')
        setResultado(json.datos)
        setValores({ monto: '', item: '', categoria: '', fecha: '' })
        setMetodo('TC')
        setTimeout(() => refs.current['monto']?.focus(), 100)
        setTimeout(() => {
          setEstado('idle')
          setResultado(null)
        }, 4000)
      } else {
        setEstado('error')
        setResultado(json)
        setTimeout(() => setEstado('idle'), 4000)
      }
    } catch {
      setEstado('error')
      setTimeout(() => setEstado('idle'), 4000)
    }
  }

  const listo = valores.monto && valores.item

  return (
    <main className="min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center px-6">
      {/* Header */}
      <div className="mb-16 text-center">
        <p className="text-[#444] text-xs tracking-[0.3em] uppercase mb-2">saldai</p>
        <div className="w-6 h-px bg-[#333] mx-auto" />
      </div>

      {/* Frase de inputs */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-4 justify-center mb-10">
        <span className="text-[#333] text-2xl font-light">$</span>

        {CAMPOS.map((campo, i) => (
          <span key={campo.key} className="flex items-baseline gap-x-3">
            <input
              ref={el => (refs.current[campo.key] = el)}
              type={campo.type}
              value={valores[campo.key]}
              placeholder={campo.placeholder}
              onChange={e => handleChange(campo.key, e.target.value)}
              onKeyDown={e => handleKeyDown(e, campo.key)}
              autoFocus={i === 0}
              className={`
                bg-transparent border-none outline-none
                text-[#e8e8e8] placeholder-[#2a2a2a]
                text-2xl font-light tracking-wide
                border-b border-[#222] focus:border-[#555]
                transition-colors duration-200
                ${campo.width}
              `}
            />
            {i < CAMPOS.length - 1 && <span className="text-[#252525] text-lg select-none">/</span>}
          </span>
        ))}

        {/* Toggle EF / TC */}
        <button
          onClick={() => setMetodo(m => (m === 'TC' ? 'EF' : 'TC'))}
          className="
            text-2xl font-light tracking-wide
            transition-colors duration-200
            border-b border-[#222]
            pb-px px-1
            text-[#555] hover:text-[#e8e8e8]
            cursor-pointer select-none
          "
        >
          {metodo}
        </button>
      </div>

      {/* Botón guardar */}
      <button
        onClick={handleSubmit}
        disabled={!listo || estado === 'loading'}
        className={`
          mt-2 px-8 py-2 text-xs tracking-[0.25em] uppercase
          border transition-all duration-300
          ${
            listo && estado !== 'loading'
              ? 'border-[#333] text-[#888] hover:border-[#666] hover:text-[#e8e8e8]'
              : 'border-[#1a1a1a] text-[#2a2a2a] cursor-not-allowed'
          }
        `}
      >
        {estado === 'loading' ? 'guardando...' : 'guardar'}
      </button>

      {/* Feedback */}
      {estado === 'ok' && resultado && (
        <div className="mt-10 text-center animate-fade-in">
          <p className="text-[#e8e8e8] text-lg font-light mb-1">{resultado.montoFormateado}</p>
          <p className="text-[#444] text-xs tracking-widest uppercase">
            {resultado.categoria} · {resultado.metodo} · {resultado.fecha}
          </p>
        </div>
      )}

      {estado === 'error' && (
        <div className="mt-10 text-center">
          <p className="text-[#663333] text-xs tracking-widest uppercase">
            {resultado?.errores?.[0] ?? 'error al guardar'}
          </p>
        </div>
      )}

      {/* Hint */}
      <p className="mt-20 text-[#222] text-xs tracking-widest">
        enter para avanzar · tab para saltar · enter en último campo guarda
      </p>
    </main>
  )
}
