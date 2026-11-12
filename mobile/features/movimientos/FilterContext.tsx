import React, { createContext, useContext, useState, ReactNode } from 'react';

type FilterContextType = {
  /** La categoría por la que está filtrado el listado del mes, o `null`. */
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

/**
 * La categoría elegida en el filtro del footer.
 *
 * Es lo único que guarda: cuáles son las categorías del mes se deriva de los
 * movimientos del mes, y antes estaba acá como un segundo estado que alguien tenía
 * que llenar. Nadie lo llenaba — `setAvailableCategories` no tenía un solo
 * llamador — así que la condición `length > 0` del footer nunca se cumplía y la
 * fila de filtros no se dibujaba nunca. Un dato derivado guardado aparte es una
 * copia que se desincroniza, y en este caso directamente no se escribió jamás.
 *
 * Vive arriba del provider de movimientos porque sobrevive al cambio de pantalla: el
 * footer, que es la tab bar, es el que lo prende y lo apaga.
 */
export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <FilterContext.Provider value={{ selectedCategory, setSelectedCategory }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}
