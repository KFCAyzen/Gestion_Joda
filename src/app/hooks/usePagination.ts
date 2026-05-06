import { useState, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

interface PaginationConfig {
  pageSize?: number;
  initialPage?: number;
}

interface PaginationResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  refresh: () => void;
}

export function usePagination<T>(
  supabase: SupabaseClient,
  tableName: string,
  config: PaginationConfig = {}
): PaginationResult<T> {
  const { pageSize = 20, initialPage = 1 } = config;
  
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const fetchData = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Récupérer le total
      const { count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      // Récupérer les données paginées
      const { data: items, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .range(from, to)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setData(items || []);
      setTotalCount(count || 0);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, tableName, pageSize]);

  const nextPage = useCallback(() => {
    if (hasNextPage) fetchData(currentPage + 1);
  }, [hasNextPage, currentPage, fetchData]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) fetchData(currentPage - 1);
  }, [hasPrevPage, currentPage, fetchData]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) fetchData(page);
  }, [totalPages, fetchData]);

  const refresh = useCallback(() => {
    fetchData(currentPage);
  }, [currentPage, fetchData]);

  return {
    data,
    loading,
    error,
    currentPage,
    totalPages,
    totalCount,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
    refresh,
  };
}
