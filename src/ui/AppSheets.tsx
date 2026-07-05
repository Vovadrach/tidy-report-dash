import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useApplyAllocations, useClients, useWorkDays } from "@/data/queries";
import type { DayLike } from "@/domain/money";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import { DaySheet } from "@/components/DaySheet";
import { PaymentSheet } from "@/ui/PaymentSheet";

/**
 * AppSheets — глобальні нижні листи «Ясно». Будь-який екран і док
 * викликають openQuickAdd / openDay / openPayment; листи монтуються тут раз.
 */
interface SheetsApi {
  openQuickAdd: (prefill?: { clientId?: string; date?: string }) => void;
  openDay: (dayId: string) => void;
  openPayment: (clientId: string) => void;
}

const Ctx = createContext<SheetsApi | null>(null);

export const useSheets = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSheets must be used within AppSheetsProvider");
  return c;
};

export function AppSheetsProvider({ children }: { children: ReactNode }) {
  const { data: days = [] } = useWorkDays();
  const { data: clients = [] } = useClients();
  const apply = useApplyAllocations();

  const [quick, setQuick] = useState<{ open: boolean; prefill?: { clientId?: string; date?: string } }>({
    open: false,
  });
  const [dayId, setDayId] = useState<string | null>(null);
  const [dayOpen, setDayOpen] = useState(false);
  const [payClientId, setPayClientId] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const api = useMemo<SheetsApi>(
    () => ({
      openQuickAdd: (prefill) => setQuick({ open: true, prefill }),
      openDay: (id) => {
        setDayId(id);
        setDayOpen(true);
      },
      openPayment: (clientId) => {
        setPayClientId(clientId);
        setPayOpen(true);
      },
    }),
    [],
  );

  const payClient = clients.find((c) => c.id === payClientId);
  const payDays: DayLike[] = days
    .filter(
      (d) =>
        d.clientId === payClientId &&
        !d.isPlanned &&
        d.amount - Math.min(d.paidAmount, d.amount) > 0.004,
    )
    .map((d) => ({ id: d.id, date: d.date, amount: d.amount, paidAmount: d.paidAmount }));

  return (
    <Ctx.Provider value={api}>
      {children}
      <QuickAddSheet
        open={quick.open}
        onOpenChange={(o) => setQuick((s) => ({ ...s, open: o }))}
        prefill={quick.prefill}
      />
      <DaySheet open={dayOpen} onOpenChange={setDayOpen} dayId={dayId} />
      {payClient && (
        <PaymentSheet
          open={payOpen}
          onOpenChange={setPayOpen}
          clientName={payClient.name}
          days={payDays}
          onApply={(allocs) => apply.mutate(allocs)}
        />
      )}
    </Ctx.Provider>
  );
}
