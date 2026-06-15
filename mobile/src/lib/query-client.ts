import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient partagé. À l'étape « offline » on branchera ici un persister
 * (MMKV) pour conserver le cache hors-ligne — d'où les valeurs de gcTime/retry
 * déjà posées.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 24 * 60 * 60 * 1000, // 24 h — utile une fois la persistance offline branchée
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
