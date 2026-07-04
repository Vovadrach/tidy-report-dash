import { useEffect, useState } from "react";
import { CloudSlash } from "@phosphor-icons/react";

/** Банер офлайну: дані читаються з кешу, зміни — коли повернеться мережа. */
export const OfflineBanner = () => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[90] flex justify-center pointer-events-none">
      <div className="mt-2 px-4 py-1.5 rounded-full bg-foreground text-background text-xs font-bold flex items-center gap-1.5 shadow-lg">
        <CloudSlash className="w-3.5 h-3.5" />
        Офлайн — показую збережені дані
      </div>
    </div>
  );
};
