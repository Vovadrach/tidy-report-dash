import { useCallback, useEffect, useRef, useState } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import { safeStorage } from '@/lib/storage';

/** Saves revisions in order; retains a failed draft and protects route/tab navigation. */
export const useAutosaveDraft = <T extends Record<string, unknown>,>(key: string, initial: T, save: (draft: T) => Promise<unknown>) => {
  const restored = useRef(false);
  const [draft, setDraft] = useState<T>(() => {
    try {
      const stored: unknown = JSON.parse(safeStorage.getItem(key) ?? 'null');
      if (stored && typeof stored === 'object' && !Array.isArray(stored) &&
          Object.keys(initial as object).every(field => typeof (stored as Record<string, unknown>)[field] === typeof initial[field])) {
        restored.current = true; return stored as T;
      }
    } catch { /* Corrupt local drafts never block the record. */ }
    return initial;
  });
  const latest = useRef(draft);
  const revision = useRef(restored.current ? 1 : 0);
  const saved = useRef(0);
  const saveRef = useRef(save);
  saveRef.current = save;
  const active = useRef(true);
  const running = useRef<Promise<void> | null>(null);
  const [state, setState] = useState({ saving: false, dirty: restored.current, error: false, saved: false });
  const saveNow = useCallback(() => {
    if (running.current) return running.current;
    if (saved.current === revision.current) return Promise.resolve();
    const task = async () => {
      if (active.current) setState(s => ({ ...s, saving: true, error: false }));
      try {
        while (saved.current !== revision.current) {
          const target = revision.current;
          await saveRef.current(latest.current);
          saved.current = target;
        }
        safeStorage.removeItem(key);
        if (active.current) setState({ saving: false, dirty: false, error: false, saved: true });
      } catch (error) {
        if (active.current) setState(s => ({ ...s, saving: false, dirty: true, error: true, saved: false }));
        throw error;
      } finally { running.current = null; }
    };
    running.current = task();
    return running.current;
  }, [key]);
  const update = (next: T) => {
    latest.current = next; revision.current++;
    safeStorage.setItem(key, JSON.stringify(next));
    setDraft(next);
    setState(s => ({ ...s, dirty: true, error: false, saved: false }));
  };
  const rebase = useCallback((next: T) => {
    if (revision.current !== saved.current || running.current) return;
    if (JSON.stringify(latest.current) !== JSON.stringify(next)) { latest.current = next; setDraft(next); }
  }, []);
  const discard = () => {
    saved.current = revision.current;
    safeStorage.removeItem(key);
    setState(s => ({ ...s, dirty: false, error: false }));
  };
  useEffect(() => {
    if (!state.dirty || state.error) return;
    const timer = setTimeout(() => { void saveNow().catch(() => {}); }, 800);
    return () => clearTimeout(timer);
  }, [draft, state.dirty, state.error, saveNow]);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useBeforeUnload(useCallback(event => {
    if (revision.current !== saved.current) { event.preventDefault(); event.returnValue = ''; }
  }, []));
  const navigation = useRef<string | null>(null);
  const blocker = useBlocker(() => revision.current !== saved.current);
  useEffect(() => {
    if (blocker.state !== 'blocked') { navigation.current = null; return; }
    const key = blocker.location.key;
    if (!state.error && navigation.current !== key) {
      navigation.current = key;
      void saveNow().then(() => { if (navigation.current === key) blocker.proceed(); }).catch(() => { navigation.current = null; });
    }
  }, [blocker, saveNow, state.error]);
  return { draft, update, saveNow, discard, rebase, ...state, blocker };
};
