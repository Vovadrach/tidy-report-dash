import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { WifiOff } from "lucide-react";
import { spring } from "./motion";

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

  return (
    <AnimatePresence>
      {offline && (
        <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1, transition: spring.pop }} exit={{ y: -40, opacity: 0 }}
          className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-[90] flex justify-center">
          <div className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-footnote font-semibold text-canvas shadow-float">
            <WifiOff size={15} strokeWidth={2.3} />
            Офлайн — показую збережені дані
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
