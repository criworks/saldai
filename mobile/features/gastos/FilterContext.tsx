import React, { createContext, useContext, useState, ReactNode } from 'react';

type FilterContextType = {
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  availableCategories: string[];
  setAvailableCategories: (categories: string[]) => void;
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  return (
    <FilterContext.Provider value={{ 
      selectedCategory, 
      setSelectedCategory,
      availableCategories,
      setAvailableCategories
    }}>
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
