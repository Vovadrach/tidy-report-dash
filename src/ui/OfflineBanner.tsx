import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Банер офлайну «Ясно»: тонка пігулка, дані з кешу; зміни — коли повернеться мережа. */
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
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center">
      <div className="mt-2 flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2">
        <WifiOff size={14} className="text-danger" />
        Офлайн — показую збережені дані
      </div>
    </div>
  );
};
