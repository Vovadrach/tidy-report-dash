import { useEffect, useState } from 'react';
import { todayLocal } from '@/domain/dates';

/** Local day updates at midnight and after a suspended tab resumes. */
export const useToday = () => {
  const [today, setToday] = useState(todayLocal);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      setToday(todayLocal()); clearTimeout(timer);
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(update, midnight.getTime() - now.getTime() + 50);
    };
    update(); window.addEventListener('focus', update); document.addEventListener('visibilitychange', update);
    return () => { clearTimeout(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
  }, []);
  return today;
};
