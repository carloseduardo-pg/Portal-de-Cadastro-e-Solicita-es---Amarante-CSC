import { useEffect, useState } from 'react';
import { productsApi } from '../lib/resources';
import type { ProductSearchResult } from '../lib/types';

type Options = {
  query: string;
  hotelId?: string;
  itemKind?: 'CONSUMPTION' | 'FIXED_ASSET';
  /** Bloqueio: lista apenas itens ativos (só eles podem ser bloqueados). */
  activeOnly?: boolean;
  enabled?: boolean;
  debounceMs?: number;
};

/** Mínimo de caracteres — código pode ter 2 dígitos; descrição precisa de 3. */
const MIN_QUERY_LENGTH = 2;

/**
 * Busca ao vivo na base unificada: similaridade pg_trgm na descrição
 * **ou** casamento por código (unificado, legado, SAP, NCM).
 */
export function useSimilarProducts({
  query,
  hotelId,
  itemKind,
  activeOnly,
  enabled = true,
  debounceMs = 300,
}: Options) {
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!enabled || query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      void productsApi
        .search({ q: query, hotelId, itemKind, activeOnly })
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
  }, [query, hotelId, itemKind, activeOnly, enabled, debounceMs]);

  return {
    results,
    loading,
    searched,
    hasSimilar: searched && results.length > 0,
  };
}
