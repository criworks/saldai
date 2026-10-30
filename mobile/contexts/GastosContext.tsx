import { useQuery } from '@tanstack/react-query';
import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import type { Gasto, GastosDelMes } from '@saldai/core';
import { llaves } from '../lib/consultas';
import { fetchGastosPorMes } from '../services/api';

// El contrato de la API vive en @saldai/core, para que mobile y la API no se
// desincronicen. Antes estaba declarado acá a mano y por eso `fecha` y
// `categoria` eran `string` suelto.
export type { Gasto } from '@saldai/core'

export interface CategoriaInfo {
  total: number
  cantidad: number
}

export type DatosResponse = GastosDelMes

type GastosContextType = {
  mes: number;
  anio: number;
  setMes: (mes: number) => void;
  datos: DatosResponse | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** Vuelve a pedir el mes que se está mirando (pull to refresh, reintento). */
  fetchGastos: () => Promise<void>;
  categorias: [string, CategoriaInfo][];
  totalMes: number;
};

const GastosContext = createContext<GastosContextType | undefined>(undefined);

/**
 * El mes que se está mirando, y sus gastos.
 *
 * Los gastos los trae react-query: el mes que ya se cargó se muestra al toque
 * al volver a él, en vez de dejar la pantalla en esqueleto mientras se vuelve a
 * pedir lo mismo, y un error de red se reintenta solo (ver `lib/consultas`).
 * El contexto queda con lo que es estado de la app de verdad: qué mes se mira.
 */
export function GastosProvider({ children }: { children: ReactNode }) {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio] = useState(new Date().getFullYear());

  const consulta = useQuery({
    queryKey: llaves.gastosDelMes(mes, anio),
    queryFn: () => fetchGastosPorMes(mes, anio),
  });

  const datos = consulta.data ?? null;

  // `loading` es solo la primera carga de un mes que nunca se vio: si ya hay
  // datos en caché no se muestra el esqueleto, que es el punto de la caché.
  const loading = consulta.isPending;
  // Un refetch con datos ya en pantalla, que es lo que pide el pull to refresh.
  const refreshing = consulta.isFetching && !consulta.isPending;

  const fetchGastos = async () => {
    await consulta.refetch();
  };

  const categorias = useMemo(() => {
    const porCategoria = datos?.datos?.reduce((acc: Record<string, CategoriaInfo>, g: Gasto) => {
      const cat = g.categoria || 'Sin categoría';
      if (!acc[cat]) acc[cat] = { total: 0, cantidad: 0 };
      acc[cat].total += g.monto;
      acc[cat].cantidad += 1;
      return acc;
    }, {}) ?? {};

    return Object.entries(porCategoria).sort((a, b) => b[1].total - a[1].total);
  }, [datos]);

  const totalMes = datos?.total ?? 0;

  return (
    <GastosContext.Provider value={{
      mes,
      anio,
      setMes,
      datos,
      loading,
      refreshing,
      error: consulta.error instanceof Error ? consulta.error.message : null,
      fetchGastos,
      categorias,
      totalMes,
    }}>
      {children}
    </GastosContext.Provider>
  );
}

export function useGastos() {
  const context = useContext(GastosContext);
  if (context === undefined) {
    throw new Error('useGastos must be used within a GastosProvider');
  }
  return context;
}
