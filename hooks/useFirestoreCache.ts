import { useCallback, useRef } from "react";



interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function useFirestoreCache(defaultTTL = 5 * 60 * 1000) {
  const cacheRef = useRef<Map<string, CacheEntry<any>>>(new Map());

  const get = useCallback(
    async <T>(
      key: string,
      fetchFn: () => Promise<T>,
      ttl = defaultTTL,
    ): Promise<T> => {
      const cached = cacheRef.current.get(key);

      // Se tem no cache E não expirou
      if (cached && Date.now() - cached.timestamp < ttl) {
        console.log(`[Cache HIT] ${key}`);
        return cached.data as T;
      }

      // Se não, busca e cachea
      console.log(`[Cache MISS] ${key} - Fetching...`);
      const data = await fetchFn();
      cacheRef.current.set(key, {
        data,
        timestamp: Date.now(),
      });

      return data;
    },
    [defaultTTL],
  );

  const invalidate = useCallback((key: string) => {
    cacheRef.current.delete(key);
    console.log(`[Cache INVALIDATE] ${key}`);
  }, []);

  const invalidateAll = useCallback(() => {
    cacheRef.current.clear();
    console.log(`[Cache CLEAR] All entries`);
  }, []);

  return { get, invalidate, invalidateAll };
}
