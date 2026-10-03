import { useEffect, useRef, useState } from 'react';

export const usePullToRefresh = (onRefresh: () => Promise<unknown>) => {
  const [pulling, setPulling] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useRef(onRefresh);
  refresh.current = onRefresh;
  useEffect(() => {
    let active = true;
    let start: number | null = null;
    let distance = 0;
    let busy = false;
    const reset = () => { start = null; distance = 0; if (active) setPulling(0); };
    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || busy || window.scrollY > 0 ||
          (event.target instanceof Element && event.target.closest('input,textarea,select,[data-no-swipe],[role="dialog"]'))) return reset();
      start = event.touches[0].clientY;
    };
    const onMove = (event: TouchEvent) => {
      if (start === null || busy) return;
      if (event.touches.length !== 1 || window.scrollY > 0) return reset();
      distance = Math.max(0, Math.min((event.touches[0].clientY - start) / 72, 1.4));
      setPulling(distance);
    };
    const onEnd = () => {
      const shouldRefresh = distance >= 1 && !busy;
      reset();
      if (!shouldRefresh) return;
      busy = true; setRefreshing(true);
      void Promise.resolve().then(() => refresh.current()).catch(() => {}).finally(() => {
        busy = false; if (active) setRefreshing(false);
      });
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', reset, { passive: true });
    return () => {
      active = false;
      window.removeEventListener('touchstart', onStart); window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd); window.removeEventListener('touchcancel', reset);
    };
  }, []);
  return { pulling, refreshing };
};
