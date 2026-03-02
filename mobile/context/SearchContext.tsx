/**
 * Global search query from the navbar. Screens can use useSearch() to filter content.
 */
import React, { createContext, useContext, useState } from 'react';

type SearchContextValue = { searchQuery: string; setSearchQuery: (q: string) => void };

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const value = { searchQuery, setSearchQuery };
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) return { searchQuery: '', setSearchQuery: () => {} };
  return ctx;
}
