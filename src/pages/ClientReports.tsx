import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Report, WorkDay, Client, PaymentStatus } from "@/types/report";
import { Clock, Euro, CheckCircle2, XCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";
import { decimalToHours } from "@/utils/timeFormat";
import { useWorker } from "@/contexts/WorkerContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Helper function to extract worker-specific data from work day
const getWorkerDataFromWorkDay = (day: WorkDay, workerId: string | 'all') => {
  if (workerId === 'all') {
    return { amount: day.amount, hours: day.hours };
  }

  const assignment = day.assignments?.find(a =>
    (a.worker_id === workerId || a.workerId === workerId)
  );

  if (assignment) {
    return { amount: assignment.amount, hours: assignment.hours };
  }

  return { amount: 0, hours: 0 };
};

const ClientReports = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { selectedWorkerId } = useWorker();
  const [client, setClient] = useState<Client | null>(null);
  const [unpaidWorkDays, setUnpaidWorkDays] = useState<Array<WorkDay & { reportId: string; reportDate: string }> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId, selectedWorkerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Отримуємо всі звіти
      const reports = await api.getReports();
      
      // Отримуємо клієнтів
      const clients = await api.getClients();
      const loadedClient = clients.find((c) => c.id === clientId);
      setClient(loadedClient || null);
      
      // Фільтруємо звіти цього клієнта
      const clientReports = reports.filter((r) => (r.clientId || r.client_id) === clientId);
      
      // Збираємо всі неоплачені та частково оплачені робочі дні
      const unpaidDays: Array<WorkDay & { reportId: string; reportDate: string }> = [];

      clientReports.forEach(report => {
        report.workDays.forEach(day => {
          const status = day.paymentStatus || day.payment_status;

          // Filter by worker if not "all"
          if (selectedWorkerId !== 'all') {
            const hasAssignment = day.assignments?.some(a =>
              a.worker_id === selectedWorkerId || a.workerId === selectedWorkerId
            );
            if (!hasAssignment) return;
          }

          // For worker-specific view, check if worker has unpaid amount
          if (selectedWorkerId !== 'all') {
            const workerData = getWorkerDataFromWorkDay(day, selectedWorkerId);
            if (workerData.amount === 0) return;

            // For worker view: only show if status is NOT fully paid
            // (unpaid or partial both count as "not paid" for worker)
            if (status === 'paid') return;

            if (status === 'partial') {
              const dayTotalAmount = day.amount || 0;
              const dayPaid = day.day_paid_amount || 0;
              if (dayTotalAmount > 0) {
                const workerPaid = (workerData.amount / dayTotalAmount) * dayPaid;
                // If worker's share is fully paid, exclude it
                if (workerPaid >= workerData.amount) return;
              }
            }

            unpaidDays.push({
              ...day,
              reportId: report.id,
              reportDate: report.date
            });
          } else {
            // For "all" view: show unpaid and partial
            if (status === "unpaid" || status === "partial") {
              unpaidDays.push({
                ...day,
                reportId: report.id,
                reportDate: report.date
              });
            }
          }
        });
      });

      setUnpaidWorkDays(unpaidDays);
    } catch (error) {
      toast.error('Помилка завантаження даних клієнта');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (dayId: string, newStatus: PaymentStatus, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await api.updateWorkDay(dayId, {
        payment_status: newStatus,
        day_paid_amount: newStatus === "paid" ? undefined : 0
      });

      await loadData();
      toast.success('Статус оновлено');
    } catch (error) {
      toast.error('Помилка оновлення статусу');
      console.error(error);
    }
  };

  const handleMarkAllAsPaid = async () => {
    if (!unpaidWorkDays || unpaidWorkDays.length === 0) return;

    try {
      // Update all unpaid days to paid
      await Promise.all(
        unpaidWorkDays.map(day =>
          api.updateWorkDay(day.id, {
            payment_status: "paid" as PaymentStatus,
            day_paid_amount: day.amount
          })
        )
      );

      await loadData();
      toast.success(`Оплачено ${unpaidWorkDays.length} записів`);
    } catch (error) {
      toast.error('Помилка оновлення статусів');
      console.error(error);
    }
  };

  // Calculate total unpaid amount and hours
  const unpaidAmount = unpaidWorkDays?.reduce((sum, day) => {
    const status = day.paymentStatus || day.payment_status;
    const workerData = getWorkerDataFromWorkDay(day, selectedWorkerId);

    if (status === "unpaid") {
      return sum + workerData.amount;
    } else if (status === "partial") {
      const dayTotalAmount = day.amount || 0;
      const dayPaid = day.day_paid_amount || 0;

      if (selectedWorkerId !== 'all' && dayTotalAmount > 0) {
        // Calculate worker's proportional paid amount
        const workerPaid = (workerData.amount / dayTotalAmount) * dayPaid;
        return sum + (workerData.amount - workerPaid);
      } else {
        return sum + (workerData.amount - dayPaid);
      }
    }
    return sum;
  }, 0) || 0;

  const unpaidHours = unpaidWorkDays?.reduce((sum, day) => {
    const status = day.paymentStatus || day.payment_status;
    const workerData = getWorkerDataFromWorkDay(day, selectedWorkerId);
    let minutesToAdd = 0;

    if (status === "unpaid") {
      minutesToAdd = Math.round(workerData.hours * 60);
    } else if (status === "partial") {
      const dayTotalAmount = day.amount || 0;
      const dayPaid = day.day_paid_amount || 0;

      if (selectedWorkerId !== 'all' && dayTotalAmount > 0) {
        // Calculate worker's proportional paid amount
        const workerPaid = (workerData.amount / dayTotalAmount) * dayPaid;
        const workerUnpaid = workerData.amount - workerPaid;

        // Calculate proportional hours
        if (workerData.amount > 0) {
          const unpaidRatio = workerUnpaid / workerData.amount;
          minutesToAdd = Math.round(workerData.hours * unpaidRatio * 60);
        }
      } else {
        const hourlyRate = client?.hourlyRate || client?.hourly_rate || 0;
        if (hourlyRate > 0) {
          const paidHours = dayPaid / hourlyRate;
          minutesToAdd = Math.round((workerData.hours - paidHours) * 60);
        }
      }
    }
    return sum + minutesToAdd;
  }, 0) / 60 || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Завантаження...</p>
      </div>
    );
  }

  if (!client || !unpaidWorkDays) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Клієнт не знайдено</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 pt-4">
      {/* Fixed top section */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl border-b border-white/10 shadow-[0_2px_16px_0_rgba(31,38,135,0.1)]">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-center text-foreground">{client.name}</h1>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-20 max-w-4xl space-y-3">
        {/* Summary Cards - Unpaid amount and hours */}
        {unpaidWorkDays && unpaidWorkDays.length > 0 && (
          <div className="bg-card rounded-lg p-4 shadow-md border border-border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-warning/10 rounded-md p-3 flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                <p className="text-lg font-bold text-warning">{Math.round(unpaidAmount)}€</p>
              </div>
              <div className="bg-primary/10 rounded-md p-3 flex items-center justify-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <p className="text-lg font-bold text-foreground">{decimalToHours(unpaidHours)}</p>
              </div>
            </div>

            {/* Mark All as Paid Button */}
            <Button
              onClick={handleMarkAllAsPaid}
              className="w-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold shadow-md"
              size="sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Оплачено всі ({unpaidWorkDays.length})
            </Button>
          </div>
        )}

        {/* Work Days List */}
        {unpaidWorkDays && unpaidWorkDays.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-center text-muted-foreground">Всі робочі дні оплачені</p>
          </div>
        ) : (
          unpaidWorkDays && unpaidWorkDays.map((day) => {
            const status = day.paymentStatus || day.payment_status || "unpaid";
            const workerData = getWorkerDataFromWorkDay(day, selectedWorkerId);

            // Calculate remaining amount to pay for this worker
            let remainingAmount = workerData.amount;
            if (status === "partial") {
              const dayTotalAmount = day.amount || 0;
              const dayPaid = day.day_paid_amount || 0;

              if (selectedWorkerId !== 'all' && dayTotalAmount > 0) {
                const workerPaid = (workerData.amount / dayTotalAmount) * dayPaid;
                remainingAmount = workerData.amount - workerPaid;
              } else {
                remainingAmount = workerData.amount - dayPaid;
              }
            }

            // For worker view: simplified status (paid/unpaid only)
            const displayStatus = selectedWorkerId !== 'all'
              ? (status === 'paid' ? 'paid' : 'unpaid')
              : status;

            return (
              <div
                key={`${day.reportId}-${day.id}`}
                onClick={() => navigate(`/report/${day.reportId}/day/${day.id}`)}
                className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-border/50 shadow-lg hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  {/* Ліва частина: статус + дата */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                    {selectedWorkerId === 'all' ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 transition-all ${
                            displayStatus === 'paid' ? 'bg-success/20 hover:bg-success/30' :
                            displayStatus === 'partial' ? 'bg-warning/20 hover:bg-warning/30' :
                            'bg-destructive/20 hover:bg-destructive/30'
                          }`}>
                            <span className={`text-sm sm:text-base ${
                              displayStatus === 'paid' ? 'text-success' :
                              displayStatus === 'partial' ? 'text-warning' :
                              'text-destructive'
                            }`}>
                              {displayStatus === 'paid' ? '●' :
                               displayStatus === 'partial' ? '◐' : '○'}
                            </span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-card backdrop-blur-xl border border-border shadow-lg rounded-xl z-[100] p-1.5 min-w-[140px]">
                          {/* Active status first */}
                          {status === 'paid' && (
                            <DropdownMenuItem
                              onClick={(e) => handleStatusChange(day.id, "paid", e)}
                              className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all bg-success/20 text-success"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2 inline" />
                              Оплачено
                            </DropdownMenuItem>
                          )}
                          {status === 'partial' && (
                            <DropdownMenuItem
                              onClick={(e) => handleStatusChange(day.id, "partial", e)}
                              className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all bg-warning/20 text-warning"
                            >
                              <AlertCircle className="w-4 h-4 mr-2 inline" />
                              Частково
                            </DropdownMenuItem>
                          )}
                          {status === 'unpaid' && (
                            <DropdownMenuItem
                              onClick={(e) => handleStatusChange(day.id, "unpaid", e)}
                              className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all bg-destructive/20 text-destructive"
                            >
                              <XCircle className="w-4 h-4 mr-2 inline" />
                              Не оплачено
                            </DropdownMenuItem>
                          )}

                          {/* Other statuses */}
                          {status !== 'paid' && (
                            <DropdownMenuItem
                              onClick={(e) => handleStatusChange(day.id, "paid", e)}
                              className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all text-foreground hover:bg-success/10"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2 inline" />
                              Оплачено
                            </DropdownMenuItem>
                          )}
                          {status !== 'partial' && (
                            <DropdownMenuItem
                              onClick={(e) => handleStatusChange(day.id, "partial", e)}
                              className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all text-foreground hover:bg-warning/10"
                            >
                              <AlertCircle className="w-4 h-4 mr-2 inline" />
                              Частково
                            </DropdownMenuItem>
                          )}
                          {status !== 'unpaid' && (
                            <DropdownMenuItem
                              onClick={(e) => handleStatusChange(day.id, "unpaid", e)}
                              className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all text-foreground hover:bg-destructive/10"
                            >
                              <XCircle className="w-4 h-4 mr-2 inline" />
                              Не оплачено
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      // Static status for worker view (no dropdown)
                      <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                        displayStatus === 'paid' ? 'bg-success/20' : 'bg-destructive/20'
                      }`}>
                        <span className={`text-sm sm:text-base ${
                          displayStatus === 'paid' ? 'text-success' : 'text-destructive'
                        }`}>
                          {displayStatus === 'paid' ? '●' : '○'}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className={`text-xs sm:text-sm font-semibold truncate ${
                        displayStatus === 'paid' ? 'text-success' : 'text-foreground'
                      }`}>
                        {new Date(day.date).toLocaleDateString("uk-UA")}
                      </h3>
                      {day.note && (
                        <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">📝 {day.note}</p>
                      )}
                    </div>
                  </div>

                  {/* Права частина: години + загальна сума + залишок */}
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <div className="bg-purple-50 rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 flex items-center gap-0.5 sm:gap-1 min-w-[60px] sm:min-w-[70px]">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-foreground tabular-nums">
                        {decimalToHours(workerData.hours)}
                      </span>
                    </div>

                    <div className="bg-blue-50 rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 flex items-center gap-0.5 sm:gap-1 min-w-[60px] sm:min-w-[70px]">
                      <Euro className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-foreground tabular-nums">
                        {Math.round(workerData.amount)}
                      </span>
                    </div>

                    {/* Залишок до оплати */}
                    {displayStatus !== 'paid' && (
                      <div className={`rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 flex items-center gap-0.5 sm:gap-1 min-w-[60px] sm:min-w-[70px] ${
                        displayStatus === 'partial' ? 'bg-orange-50' : 'bg-red-50'
                      }`}>
                        <AlertCircle className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${
                          displayStatus === 'partial' ? 'text-orange-600' : 'text-red-600'
                        }`} />
                        <span className={`text-xs sm:text-sm font-bold tabular-nums ${
                          displayStatus === 'partial' ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {Math.round(remainingAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default ClientReports;