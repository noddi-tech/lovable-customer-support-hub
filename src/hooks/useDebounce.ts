import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated;

    if (timeSinceLastUpdate >= delay) {
      setThrottledValue(value);
      setLastUpdated(now);
    } else {
      const remainingTime = delay - timeSinceLastUpdate;
      const timeoutId = setTimeout(() => {
        setThrottledValue(value);
        setLastUpdated(Date.now());
      }, remainingTime);

      return () => clearTimeout(timeoutId);
    }
  }, [value, delay, lastUpdated]);

  return throttledValue;
}