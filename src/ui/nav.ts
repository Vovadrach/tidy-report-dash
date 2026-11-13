import { useCallback } from "react";
import { useNavigate, type NavigateOptions, type To } from "react-router-dom";

/**
 * Модель переходів між екранами:
 *  push — углиб ієрархії (стрічка → день, клієнт → борги): новий екран заходить справа;
 *  back — назад на рівень вище: екран відходить праворуч;
 *  tab  — між розділами дока: тихе перетікання, док стоїть на місці.
 * Тип переходу пишеться в <html data-nav>, а CSS (index.css) обирає анімацію.
 */
export type NavKind = "push" | "back" | "tab";

export const markNav = (kind: NavKind) => {
  if (typeof document !== "undefined") document.documentElement.dataset.nav = kind;
};

export const useGo = () => {
  const navigate = useNavigate();
  return useCallback((to: To, kind: NavKind = "push", options?: NavigateOptions) => {
    markNav(kind);
    navigate(to, { viewTransition: true, ...options });
  }, [navigate]);
};
