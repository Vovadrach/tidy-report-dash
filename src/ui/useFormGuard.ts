import { useCallback, useRef } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

export const useFormGuard = (dirty: boolean, pending: boolean) => {
  const saved = useRef(false);
  const blocker = useBlocker(() => !saved.current && (dirty || pending));
  useBeforeUnload(useCallback(event => {
    if (!saved.current && (dirty || pending)) { event.preventDefault(); event.returnValue = ''; }
  }, [dirty, pending]));
  return {
    blocker,
    allowExit: () => { saved.current = true; if (blocker.state === 'blocked') blocker.reset(); },
  };
};
