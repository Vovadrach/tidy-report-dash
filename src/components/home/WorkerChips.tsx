import { useEffect } from "react";
import { motion } from "motion/react";
import { Users } from "lucide-react";
import { useWorkerFilter } from "@/contexts/WorkerContext";
import { useWorkers } from "@/data/queries";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { WorkerDot } from "@/ui/Avatar";
import { spring } from "@/ui/motion";

/**
 * Фільтр «чиїми очима дивимось»: Всі або одна помічниця. Живе у верхній
 * частині дока; гортається вбік, обраний — тонова підкладка, що перетікає.
 * Прихований, якщо працює одна людина.
 */
export const WorkerChips = () => {
  const { selectedWorkerId, setSelectedWorkerId } = useWorkerFilter();
  const query = useWorkers();
  const workers = query.data ?? [];
  const { t } = useI18n();
  useEffect(() => {
    if (query.isSuccess && selectedWorkerId !== "all" && !query.data?.some((w) => w.id === selectedWorkerId)) setSelectedWorkerId("all");
  }, [query.isSuccess, query.data, selectedWorkerId, setSelectedWorkerId]);

  if (!workers || workers.length <= 1) return null;

  const chip = (id: string, label: string, lead: React.ReactNode) => {
    const active = selectedWorkerId === id;
    return (
      <button key={id} type="button" onClick={() => setSelectedWorkerId(id)} aria-pressed={active}
        className={cn("press relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-footnote font-semibold", active ? "text-accent-ink" : "text-ink-2")}>
        {active
          ? <motion.span layoutId="worker-chip" transition={spring.control} className="absolute inset-0 rounded-full bg-accent-tint" />
          : <span className="absolute inset-0 rounded-full bg-well" />}
        <span className="relative flex items-center gap-1.5">{lead}{label}</span>
      </button>
    );
  };

  return (
    <div className="scrollbar-hide flex gap-1.5 overflow-x-auto">
      {chip("all", t("common.all"), <Users size={14} strokeWidth={2.4} />)}
      {workers.map((w) => chip(w.id, w.name, <WorkerDot color={w.color} className="h-2.5 w-2.5" />))}
    </div>
  );
};
