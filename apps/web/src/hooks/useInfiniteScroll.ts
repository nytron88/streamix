import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
  rootMargin?: string;
}

interface UseInfiniteScrollReturn {
  loadMore: () => void;
  isIntersecting: boolean;
  observerRef: React.RefObject<HTMLDivElement | null>;
}

export function useInfiniteScroll({
  hasMore,
  isLoading,
  threshold = 0.1,
  rootMargin = '100px',
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      // This will be handled by the parent component
      setIsIntersecting(true);
    }
  }, [hasMore, isLoading]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          setIsIntersecting(true);
        } else {
          setIsIntersecting(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoading, threshold, rootMargin]);

  return {
    loadMore,
    isIntersecting,
    observerRef,
  };
}
