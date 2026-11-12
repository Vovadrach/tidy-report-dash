import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

/** Спільна рамка входу й реєстрації: знак, заголовок, картка з полями. */
export const AuthLayout = ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
  <div className="flex min-h-dvh items-center justify-center bg-canvas px-5 py-10">
    <div className="rise-in w-full max-w-sm">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-accent text-accent-on shadow-accent">
          <Sparkles size={30} strokeWidth={2.1} />
        </div>
        <h1 className="text-title text-ink">{title}</h1>
        <p className="mt-1 text-callout text-ink-3">{subtitle}</p>
      </div>
      {children}
    </div>
  </div>
);
