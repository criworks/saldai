import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { fetchGastosPorMes } from '../services/api';

export interface Gasto {
  id: string | number
  monto: number
  monto_formateado: string
  item: string
  categoria: string
  fecha: string
  metodo: string
}

export interface CategoriaInfo {
  total: number
  cantidad: number
}

export interface DatosResponse {
  ok: boolean
  cantidad: number
  total: number
  totalFormateado: string
  datos: Gasto[]
}

type GastosContextType = {
  mes: number;
  setMes: (mes: number) => void;
  datos: DatosResponse | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  fetchGastos: (isRefresh?: boolean) => Promise<void>;
  categorias: [string, CategoriaInfo][];
  totalMes: number;
};

const GastosContext = createContext<GastosContextType | undefined>(undefined);

export function GastosProvider({ children }: { children: ReactNode }) {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [datos, setDatos] = useState<DatosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Nuevo estado para propagar errores de red al UI sin crashear (útil en prod y testeable vía Mocks)
  const [error, setError] = useState<string | null>(null);

  const fetchGastos = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const json = await fetchGastosPorMes(mes);
      if (json.ok) setDatos(json);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Error al cargar los gastos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mes]);

  useEffect(() => {
    fetchGastos();
  }, [fetchGastos]);

  const porCategoria = datos?.datos?.reduce((acc: Record<string, CategoriaInfo>, g: Gasto) => {
    const cat = g.categoria || 'Sin categoría';
    if (!acc[cat]) acc[cat] = { total: 0, cantidad: 0 };
    acc[cat].total += g.monto;
    acc[cat].cantidad += 1;
    return acc;
  }, {}) ?? {};

  const categorias = Object.entries(porCategoria).sort(
    (a, b) => b[1].total - a[1].total
  );

  const totalMes = datos?.total ?? 0;

  return (
    <GastosContext.Provider value={{
      mes, setMes, datos, loading, refreshing, error, fetchGastos, categorias, totalMes
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
