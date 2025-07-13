'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TransactionFilters } from '@/types/database';

interface SavedFilter {
  id: string;
  name: string;
  filters: TransactionFilters;
  createdAt: Date;
  lastUsed?: Date;
}

interface FilterContextType {
  // Current active filters
  activeFilters: TransactionFilters;
  setActiveFilters: (filters: TransactionFilters) => void;
  updateFilters: (partialFilters: Partial<TransactionFilters>) => void;
  clearFilters: () => void;
  
  // Saved filters
  savedFilters: SavedFilter[];
  saveCurrentFilters: (name: string) => void;
  loadSavedFilter: (filterId: string) => void;
  deleteSavedFilter: (filterId: string) => void;
  
  // Filter preferences
  defaultFilters: TransactionFilters;
  setDefaultFilters: (filters: TransactionFilters) => void;
  
  // UI state
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (show: boolean) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

interface FilterProviderProps {
  children: ReactNode;
  initialFilters?: TransactionFilters;
}

const DEFAULT_FILTERS: TransactionFilters = {
  status: 'pending',
};

export function FilterProvider({ children, initialFilters }: FilterProviderProps) {
  const [activeFilters, setActiveFilters] = useState<TransactionFilters>(initialFilters || DEFAULT_FILTERS);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [defaultFilters, setDefaultFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Load saved filters and preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vibe-mimoni-saved-filters');
      if (saved) {
        const parsedFilters = JSON.parse(saved).map((filter: any) => ({
          ...filter,
          createdAt: new Date(filter.createdAt),
          lastUsed: filter.lastUsed ? new Date(filter.lastUsed) : undefined,
        }));
        setSavedFilters(parsedFilters);
      }

      const defaultPrefs = localStorage.getItem('vibe-mimoni-default-filters');
      if (defaultPrefs) {
        const parsed = JSON.parse(defaultPrefs);
        setDefaultFilters(parsed);
        if (!initialFilters) {
          setActiveFilters(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading filter preferences:', error);
    }
  }, [initialFilters]);

  // Save to localStorage whenever savedFilters or defaultFilters change
  useEffect(() => {
    try {
      localStorage.setItem('vibe-mimoni-saved-filters', JSON.stringify(savedFilters));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  }, [savedFilters]);

  useEffect(() => {
    try {
      localStorage.setItem('vibe-mimoni-default-filters', JSON.stringify(defaultFilters));
    } catch (error) {
      console.error('Error saving default filters:', error);
    }
  }, [defaultFilters]);

  const updateFilters = (partialFilters: Partial<TransactionFilters>) => {
    setActiveFilters(prev => ({ ...prev, ...partialFilters }));
  };

  const clearFilters = () => {
    setActiveFilters(defaultFilters);
  };

  const saveCurrentFilters = (name: string) => {
    const newFilter: SavedFilter = {
      id: `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      filters: { ...activeFilters },
      createdAt: new Date(),
    };
    
    setSavedFilters(prev => [newFilter, ...prev].slice(0, 20)); // Keep max 20 saved filters
  };

  const loadSavedFilter = (filterId: string) => {
    const filter = savedFilters.find(f => f.id === filterId);
    if (filter) {
      setActiveFilters(filter.filters);
      // Update last used timestamp
      setSavedFilters(prev => 
        prev.map(f => 
          f.id === filterId 
            ? { ...f, lastUsed: new Date() }
            : f
        )
      );
    }
  };

  const deleteSavedFilter = (filterId: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== filterId));
  };

  const handleSetDefaultFilters = (filters: TransactionFilters) => {
    setDefaultFilters(filters);
  };

  const value: FilterContextType = {
    activeFilters,
    setActiveFilters,
    updateFilters,
    clearFilters,
    savedFilters,
    saveCurrentFilters,
    loadSavedFilter,
    deleteSavedFilter,
    defaultFilters,
    setDefaultFilters: handleSetDefaultFilters,
    showAdvancedFilters,
    setShowAdvancedFilters,
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
} 