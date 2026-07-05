import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { Report, Client, WorkDay, PaymentStatus } from "@/types/report";
import { Clock, Euro, AlertCircle, CheckCircle2, XCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";
import { decimalToHours } from "@/utils/timeFormat";
import { useWorker } from "@/contexts/WorkerContext";
import { Button } from "@/components/ui/button";
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

const ReportDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedWorkerId } = useWorker();
  const [report, setReport] = useState<Report | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const handleFocus = () => {
      if (id) loadReport();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (id) loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const reports = await api.getReports();
      const loadedReport = reports.find((r) => r.id === id);
      if (loadedReport) {
        setReport(loadedReport);

        const clients = await api.getClients();
        const loadedClient = clients.find((c) => c.id === loadedReport.clientId || c.id === loadedReport.client_id);
        setClient(loadedClient || null);
      }
    } catch (error) {
      toast.error('Помилка завантаження звіту');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };


  const handleMarkAllAsPaid = async () => {
    if (!report || unpaidDays.length === 0) return;

    try {
      // Update all unpaid days to paid
      await Promise.all(
        unpaidDays.map(day =>
          api.updateWorkDay(day.id, {
            payment_status: "paid" as PaymentStatus,
            day_paid_amount: day.amount
          })
        )
      );

      await loadReport();
      toast.success(`Оплачено ${unpaidDays.length} записів`);
    } catch (error) {
      toast.error('Помилка оновлення статусів');
      console.error(error);
    }
  };

  const handleStatusChange = async (dayId: string, newStatus: PaymentStatus, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await api.updateWorkDay(dayId, {
        payment_status: newStatus,
        day_paid_amount: newStatus === "paid" ? undefined : 0
      });

      await loadReport();
      toast.success('Статус оновлено');
    } catch (error) {
      toast.error('Помилка оновлення статусу');
      console.error(error);
    }
  };

  const unpaidDays = report?.workDays.filter(day => {
    const status = day.paymentStatus || day.payment_status;

    // Filter by worker if not "all"
    if (selectedWorkerId !== 'all') {
      const hasAssignment = day.assignments?.some(a =>
        a.worker_id === selectedWorkerId || a.workerId === selectedWorkerId
      );
      if (!hasAssignment) return false;
    }

    // For worker-specific view, check if worker has unpaid amount
    if (selectedWorkerId !== 'all') {
      const workerData = getWorkerDataFromWorkDay(day, selectedWorkerId);
      if (workerData.amount === 0) return false;

      // Check if worker's share is unpaid
      if (status === 'paid') return false;

      if (status === 'partial') {
        const dayTotalAmount = day.amount || 0;
        const dayPaid = day.day_paid_amount || 0;
        if (dayTotalAmount > 0) {
          const workerPaid = (workerData.amount / dayTotalAmount) * dayPaid;
          // If worker's share is fully paid, exclude it
          if (workerPaid >= workerData.amount) return false;
        }
      }

      return true;
    }

    return status !== "paid";
  }) || [];

  const unpaidAmount = unpaidDays.reduce((sum, day) => {
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
  }, 0);

  const unpaidHours = unpaidDays.reduce((sum, day) => {
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
  }, 0) / 60;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <p className="text-muted-foreground">Завантаження...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <p className="text-muted-foreground">Звіт не знайдено</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 pt-4">
      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-4">
        {/* Client Header */}
        <div className="bg-card rounded-lg p-6 shadow-md border border-border">
          <h1 className="text-2xl font-semibold text-center text-foreground">{report.clientName || report.client_name}</h1>
        </div>

        {/* Summary Cards - Only unpaid amount and hours */}
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
          {unpaidDays.length > 0 && (
            <Button
              onClick={handleMarkAllAsPaid}
              className="w-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold shadow-md"
              size="sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Оплачено всі ({unpaidDays.length})
            </Button>
          )}
        </div>

        {/* Work Days - Only unpaid or partial */}
        <div className="bg-card rounded-lg p-6 shadow-md border border-border">
          <div className="space-y-3">
            {unpaidDays.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Всі робочі дні оплачені</p>
            ) : (
              unpaidDays.map((day) => {
                const workerData = getWorkerDataFromWorkDay(day, selectedWorkerId);
                const status = day.paymentStatus || day.payment_status || "unpaid";

                return (
                  <div
                    key={day.id}
                    className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border border-border/50 shadow-lg hover:shadow-xl transition-all"
                  >
                    {/* Статус індикатор зверху */}
                    <div className="flex items-center gap-2 mb-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 transition-all ${
                            status === 'paid' ? 'bg-success/20 hover:bg-success/30' :
                            status === 'partial' ? 'bg-warning/20 hover:bg-warning/30' :
                            'bg-destructive/20 hover:bg-destructive/30'
                          }`}>
                            <span className={`text-sm sm:text-base ${
                              status === 'paid' ? 'text-success' :
                              status === 'partial' ? 'text-warning' :
                              'text-destructive'
                            }`}>
                              {status === 'paid' ? '●' :
                               status === 'partial' ? '◐' : '○'}
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
                    </div>

                    {/* ДВА ІДЕНТИЧНІ ВІКОНЦЯ: ДАТА та ГОДИНИ */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Віконце 1: ДАТА - клікабельне */}
                      <div
                        onClick={() => navigate(`/report/${report.id}/day/${day.id}`)}
                        className="bg-blue-50 rounded-lg px-3 py-2.5 border border-blue-200 flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-100 transition-colors"
                      >
                        <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-sm font-bold text-foreground tabular-nums whitespace-nowrap">
                          {new Date(day.date).toLocaleDateString("uk-UA", { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>

                      {/* Віконце 2: ГОДИНИ - клікабельне */}
                      <div
                        onClick={() => navigate(`/report/${report.id}/day/${day.id}`)}
                        className="bg-blue-50 rounded-lg px-3 py-2.5 border border-blue-200 flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-100 transition-colors"
                      >
                        <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-sm font-bold text-foreground tabular-nums whitespace-nowrap">
                          {decimalToHours(workerData.hours)}
                        </span>
                      </div>
                    </div>

                    {/* Нотатка якщо є */}
                    {day.note && (
                      <p className="text-xs text-muted-foreground mt-2">📝 {day.note}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default ReportDetails;
