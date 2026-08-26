import { useEffect, useState } from 'react';
import { productsApi } from '../lib/resources';
import type { ProductSearchResult } from '../lib/types';

type Options = {
  query: string;
  hotelId?: string;
  enabled?: boolean;
  debounceMs?: number;
};

/** Busca ao vivo por itens parecidos na base unificada (pg_trgm). */
export function useSimilarProducts({
  query,
  hotelId,
  enabled = true,
  debounceMs = 300,
}: Options) {
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!enabled || query.trim().length < 3) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      void productsApi
        .search({ q: query, hotelId })
        .then((r) => {
          setResults(r.data);
          setSearched(true);
        })
        .catch(() => {
          setResults([]);
          setSearched(true);
        })
        .finally(() => setLoading(false));
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, hotelId, enabled, debounceMs]);

  return {
    results,
    loading,
    searched,
    hasSimilar: searched && results.length > 0,
  };
}
