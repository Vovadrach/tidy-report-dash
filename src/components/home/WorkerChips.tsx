import { useWorker } from "@/contexts/WorkerContext";
import { Users } from "lucide-react";
import { useI18n } from "@/i18n";

/**
 * WorkerChips — панель-бар вибору працівниці (як нав-меню): суцільна картка з
 * hairline, усередині горизонтальний скрол бейджів (вправо-вліво), вибір напряму.
 */
export const WorkerChips = () => {
  const { workers, selectedWorkerId, setSelectedWorkerId } = useWorker();
  const { t } = useI18n();

  if (!workers || workers.length <= 1) return null;

  const base =
    "press shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors border";

  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto rounded-[1.6rem] border border-border bg-card p-2">
      <button
        type="button"
        onClick={() => setSelectedWorkerId("all")}
        className={
          selectedWorkerId === "all"
            ? `${base} border-primary bg-primary text-primary-foreground`
            : `${base} border-border bg-card text-foreground`
        }
      >
        <Users size={15} strokeWidth={2.3} />
        {t("common.all")}
      </button>

      {workers.map((w) => {
        const active = selectedWorkerId === w.id;
        return (
          <button
            key={w.id}
            type="button"
            onClick={() => setSelectedWorkerId(w.id)}
            className={
              active
                ? `${base} border-primary bg-primary text-primary-foreground`
                : `${base} border-border bg-card text-foreground`
            }
          >
            <span
              className="h-2.5 w-2.5 rounded-full ring-2 ring-white/50"
              style={{ background: active ? "currentColor" : w.color || "#94a3b8" }}
            />
            {w.name}
          </button>
        );
      })}
    </div>
  );
};
