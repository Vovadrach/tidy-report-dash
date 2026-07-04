import { useEffect, useRef, useState } from "react";

/**
 * Pull-to-refresh (R-3: кастомний — нативний overscroll не працює
 * в iOS standalone PWA). Тягнеться лише коли сторінка на самому верху.
 */
export const usePullToRefresh = (onRefresh: () => Promise<unknown>) => {
  const [pulling, setPulling] = useState(0); // 0..1
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const THRESHOLD = 72;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) startY.current = e.touches[0].clientY;
      else startY.current = null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 8 && window.scrollY <= 0) {
        setPulling(Math.min(dy / THRESHOLD, 1.4));
      }
    };
    const onTouchEnd = () => {
      if (startY.current === null) return;
      if (pulling >= 1 && !refreshing) {
        setRefreshing(true);
        onRefresh().finally(() => {
          setRefreshing(false);
          setPulling(0);
        });
      } else {
        setPulling(0);
      }
      startY.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pulling, refreshing, onRefresh]);

  return { pulling, refreshing };
};
