import { useState, useMemo } from "react";
import { Report, Client } from "@/types/report";
import { Clock, Euro, ChevronDown, ChevronUp } from "lucide-react";
import { decimalToHours } from "@/utils/timeFormat";

interface WorkerUnpaidViewProps {
  reports: Report[];
  clients: Client[];
  selectedWorkerId: string;
}

interface ClientDebt {
  clientId: string;
  clientName: string;
  totalUnpaidAmount: number;
  totalUnpaidHours: number;
  workDays: Array<{
    date: string;
    hours: number;
    amount: number;
    note?: string;
  }>;
}

export const WorkerUnpaidView = ({ reports, clients, selectedWorkerId }: WorkerUnpaidViewProps) => {
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  // Calculate debts per client for selected worker
  const clientDebts = useMemo(() => {
    const debtsMap = new Map<string, ClientDebt>();

    reports.forEach(report => {
      const clientId = report.clientId || report.client_id || '';
      const clientName = report.clientName || report.client_name || 'Без імені';

      report.workDays?.forEach(day => {
        const dayStatus = day.paymentStatus || day.payment_status;

        // Only unpaid and partial
        if (dayStatus !== 'unpaid' && dayStatus !== 'partial') return;

        // Check if worker is assigned to this day
        const hasAssignment = day.assignments?.some(a =>
          a.worker_id === selectedWorkerId || a.workerId === selectedWorkerId
        );
        if (!hasAssignment) return;

        const assignment = day.assignments?.find(a =>
          a.worker_id === selectedWorkerId || a.workerId === selectedWorkerId
        );

        if (!assignment) return;

        const workerAmount = assignment.amount || 0;
        const workerHours = assignment.hours || 0;

        // Skip if amount is 0
        if (workerAmount === 0) return;

        let unpaidAmount = 0;
        let unpaidHours = 0;

        if (dayStatus === 'unpaid') {
          unpaidAmount = workerAmount;
          unpaidHours = workerHours;
        } else if (dayStatus === 'partial') {
          const dayPaid = day.day_paid_amount || 0;
          const totalAmount = day.amount || 0;
          // Calculate worker's share of partial payment
          const workerShare = totalAmount > 0 ? (workerAmount / totalAmount) * dayPaid : 0;
          unpaidAmount = workerAmount - workerShare;

          const client = clients.find(c => c.id === clientId);
          if (client) {
            const hourlyRate = client.hourlyRate || client.hourly_rate || 0;
            if (hourlyRate > 0) {
              const paidHours = workerShare / hourlyRate;
              unpaidHours = workerHours - paidHours;
            }
          }
        }

        // Skip if unpaid amount is 0 or negative
        if (unpaidAmount <= 0) return;

        if (!debtsMap.has(clientId)) {
          debtsMap.set(clientId, {
            clientId,
            clientName,
            totalUnpaidAmount: 0,
            totalUnpaidHours: 0,
            workDays: []
          });
        }

        const debt = debtsMap.get(clientId)!;
        debt.totalUnpaidAmount += unpaidAmount;
        debt.totalUnpaidHours += unpaidHours;
        debt.workDays.push({
          date: day.date,
          hours: unpaidHours,
          amount: unpaidAmount,
          note: day.note
        });
      });
    });

    // Convert to array and sort by unpaid amount (descending)
    return Array.from(debtsMap.values())
      .filter(debt => debt.totalUnpaidAmount > 0)
      .sort((a, b) => b.totalUnpaidAmount - a.totalUnpaidAmount);
  }, [reports, clients, selectedWorkerId]);

  const totalSummary = useMemo(() => {
    let totalAmount = 0;
    let totalHours = 0;

    clientDebts.forEach(debt => {
      totalAmount += debt.totalUnpaidAmount;
      totalHours += debt.totalUnpaidHours;
    });

    return { totalAmount, totalHours };
  }, [clientDebts]);

  const toggleClient = (clientId: string) => {
    setExpandedClientId(prev => prev === clientId ? null : clientId);
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Години блок */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 p-4 shadow-sm border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0 border border-purple-200 dark:border-purple-800">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Години</p>
              <div className="flex items-baseline gap-1">
                <p className="text-xl font-bold text-black dark:text-white">{decimalToHours(totalSummary.totalHours)}</p>
                <p className="text-sm font-semibold text-black dark:text-white">год</p>
              </div>
            </div>
          </div>
        </div>

        {/* Сума блок */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 p-4 shadow-sm border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0 border border-amber-200 dark:border-amber-800">
              <Euro className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Сума</p>
              <div className="flex items-baseline gap-1">
                <p className="text-xl font-bold text-black dark:text-white">{Math.round(totalSummary.totalAmount)}</p>
                <p className="text-sm font-semibold text-black dark:text-white">€</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Client List */}
      {clientDebts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Немає неоплачених робіт</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientDebts.map(debt => (
            <div key={debt.clientId} className="bg-card rounded-lg border border-border overflow-hidden">
              {/* Client Header - Clickable */}
              <button
                onClick={() => toggleClient(debt.clientId)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 text-left">
                  <h3 className="text-sm font-bold text-foreground mb-1">{debt.clientName}</h3>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {decimalToHours(debt.totalUnpaidHours)} год
                    </span>
                    <span className="flex items-center gap-1">
                      <Euro className="w-3 h-3" />
                      {Math.round(debt.totalUnpaidAmount)}€
                    </span>
                  </div>
                </div>
                {expandedClientId === debt.clientId ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
              </button>

              {/* Work Days List - Expandable */}
              {expandedClientId === debt.clientId && (
                <div className="border-t border-border bg-muted/30">
                  {debt.workDays
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((workDay, idx) => (
                      <div
                        key={idx}
                        className="p-3 border-b border-border last:border-b-0"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-foreground">
                            {new Date(workDay.date).toLocaleDateString('uk-UA', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {decimalToHours(workDay.hours)}
                            </span>
                            <span className="font-bold text-foreground">
                              {Math.round(workDay.amount)}€
                            </span>
                          </div>
                        </div>
                        {workDay.note && (
                          <p className="text-xs text-muted-foreground truncate">
                            📝 {workDay.note}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
