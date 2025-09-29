import { useEffect, useRef } from 'react';

/**
 * Hook to ensure a fetch function runs only once per dependency change
 * Prevents double fetching in React StrictMode
 */
export function useFetchOnce(fetchFn, deps) {
  const hasFetched = useRef(false);
  const lastDeps = useRef(deps);

  useEffect(() => {
    // Check if dependencies have changed
    const depsChanged = !lastDeps.current || 
      deps.length !== lastDeps.current.length ||
      deps.some((dep, index) => dep !== lastDeps.current[index]);

    if (depsChanged) {
      hasFetched.current = false;
      lastDeps.current = deps;
    }

    // Only fetch if we haven't fetched for these dependencies
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchFn();
    }
  }, deps);
}
