'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const COLORES_CAT = {
  Básicos: '#4a7c59',
  Suscripciones: '#5b6fa6',
  Mercado: '#8a6d3b',
  Inversión: '#6b5b95',
  Ocio: '#a65b5b',
  Delivery: '#a67c52',
  Transporte: '#4a7a8a',
  'Sin categoría': '#444',
}

export default function Dashboard() {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGastos()
  }, [mes])

  async function fetchGastos() {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/gastos?mes=${mes}`)
      const json = await res.json()
      if (json.ok) setDatos(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Agrupar por categoría
  const porCategoria =
    datos?.datos?.reduce((acc, g) => {
      const cat = g.categoria || 'Sin categoría'
      if (!acc[cat]) acc[cat] = { total: 0, cantidad: 0 }
      acc[cat].total += g.monto
      acc[cat].cantidad += 1
      return acc
    }, {}) ?? {}

  const categorias = Object.entries(porCategoria).sort((a, b) => b[1].total - a[1].total)

  const totalMes = datos?.total ?? 0

  return (
    <main className="min-h-screen bg-[#0e0e0e] text-[#e8e8e8] px-6 py-12 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <p className="text-[#444] text-xs tracking-[0.3em] uppercase mb-1">saldai</p>
          <h1 className="text-2xl font-light">dashboard</h1>
        </div>
        <Link
          href="/"
          className="text-xs tracking-widest uppercase text-[#444] hover:text-[#e8e8e8] transition-colors border border-[#222] hover:border-[#444] px-4 py-2"
        >
          + nuevo
        </Link>
      </div>

      {/* Selector de mes */}
      <div className="flex gap-2 flex-wrap mb-10">
        {MESES.map((nombre, i) => {
          const num = i + 1
          const activo = mes === num
          return (
            <button
              key={num}
              onClick={() => setMes(num)}
              className={`text-xs tracking-widest uppercase px-3 py-1 transition-colors duration-200 ${
                activo ? 'text-[#e8e8e8] border-b border-[#666]' : 'text-[#333] hover:text-[#666]'
              }`}
            >
              {nombre.slice(0, 3)}
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className="text-[#333] text-xs tracking-widest">cargando...</p>
      ) : !datos || datos.cantidad === 0 ? (
        <p className="text-[#333] text-xs tracking-widest">sin gastos este mes</p>
      ) : (
        <>
          {/* Total del mes */}
          <div className="mb-12">
            <p className="text-[#444] text-xs tracking-[0.2em] uppercase mb-2">
              total {MESES[mes - 1]}
            </p>
            <p className="text-4xl font-light tracking-tight">{datos.totalFormateado}</p>
            <p className="text-[#444] text-xs mt-1">{datos.cantidad} gastos</p>
          </div>

          {/* Resumen por categoría */}
          <div className="mb-12">
            <p className="text-[#444] text-xs tracking-[0.2em] uppercase mb-5">por categoría</p>
            <div className="space-y-3">
              {categorias.map(([cat, info]) => {
                const pct = totalMes > 0 ? (info.total / totalMes) * 100 : 0
                const color = COLORES_CAT[cat] ?? '#444'
                return (
                  <div key={cat}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs tracking-widest uppercase text-[#888]">{cat}</span>
                      <span className="text-sm font-light">
                        ${info.total.toLocaleString('es-CL')}
                      </span>
                    </div>
                    <div className="h-px bg-[#1a1a1a] w-full">
                      <div
                        className="h-px transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Lista de gastos */}
          <div>
            <p className="text-[#444] text-xs tracking-[0.2em] uppercase mb-5">gastos</p>
            <div className="space-y-px">
              {datos.datos.map(g => (
                <div
                  key={g.id}
                  className="flex items-baseline justify-between py-3 border-b border-[#161616] group"
                >
                  <div className="flex items-baseline gap-4">
                    <span
                      className="text-xs w-1.5 h-1.5 rounded-full mt-1 shrink-0"
                      style={{
                        backgroundColor: COLORES_CAT[g.categoria] ?? '#444',
                        display: 'inline-block',
                      }}
                    />
                    <div>
                      <p className="text-sm font-light text-[#ccc]">{g.item}</p>
                      <p className="text-xs text-[#333] mt-0.5">
                        {g.categoria} · {g.fecha}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-light">{g.monto_formateado}</p>
                    <p className="text-xs text-[#333]">{g.metodo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  )
}
