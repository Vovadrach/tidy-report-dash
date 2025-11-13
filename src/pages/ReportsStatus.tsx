import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ReportCard } from "@/components/ReportCard";
import { api } from "@/lib/api";
import { Report, Client } from "@/types/report";
import { Clock, Euro, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";
import { decimalToHours } from "@/utils/timeFormat";
import { useWorker } from "@/contexts/WorkerContext";

const ReportsStatus = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedWorkerId } = useWorker();
  const [reports, setReports] = useState<Report[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedWorkerId]);

  useEffect(() => {
    const handleFocus = () => {
      loadData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [reportsData, clientsData] = await Promise.all([
        api.getReports(),
        api.getClients()
      ]);
      
      const reportsWithRecalculatedPayments = reportsData.map(report => {
        const workDays = report.workDays || [];

        let totalHours = 0;
        let totalEarned = 0;
        let paidAmount = 0;

        workDays.forEach(day => {
          // Filter by worker if selected
          if (selectedWorkerId !== 'all') {
            const hasAssignment = day.assignments?.some(a =>
              a.worker_id === selectedWorkerId || a.workerId === selectedWorkerId
            );
            if (!hasAssignment) return; // Skip this day if worker not assigned

            // Get worker-specific data
            const assignment = day.assignments?.find(a =>
              a.worker_id === selectedWorkerId || a.workerId === selectedWorkerId
            );

            if (assignment) {
              const workerHours = assignment.hours || 0;
              const workerAmount = assignment.amount || 0;
              const dayStatus = day.paymentStatus || day.payment_status;
              const dayPaid = day.day_paid_amount || 0;

              totalHours += workerHours;
              totalEarned += workerAmount;

              if (dayStatus === 'paid') {
                paidAmount += workerAmount;
              } else if (dayStatus === 'partial') {
                // Calculate worker's share of partial payment
                const workerShare = day.amount > 0 ? (workerAmount / day.amount) * dayPaid : 0;
                paidAmount += workerShare;
              }
            }
          } else {
            // Show all work days
            const dayHours = day.hours || 0;
            const dayAmount = day.amount || 0;
            const dayStatus = day.paymentStatus || day.payment_status;
            const dayPaid = day.day_paid_amount || 0;

            totalHours += dayHours;
            totalEarned += dayAmount;

            if (dayStatus === 'paid') {
              paidAmount += dayAmount;
            } else if (dayStatus === 'partial') {
              paidAmount += dayPaid;
            }
          }
        });

        const remainingAmount = totalEarned - paidAmount;

        let paymentStatus = 'unpaid';
        if (paidAmount === totalEarned && totalEarned > 0) {
          paymentStatus = 'paid';
        } else if (paidAmount > 0) {
          paymentStatus = 'partial';
        }

        return {
          ...report,
          totalHours,
          totalEarned,
          paidAmount,
          remainingAmount,
          paymentStatus,
        };
      });
      
      setReports(reportsWithRecalculatedPayments);
      setClients(clientsData);
    } catch (error) {
      const errorMessage = 'Помилка завантаження даних';
      toast.error(errorMessage);
      setError(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const sortedReports = useMemo(() => {
    // Фільтруємо звіти - показуємо тільки неоплачені та частково оплачені
    const unpaidReports = reports.filter(report => 
      report.paymentStatus === 'unpaid' || report.paymentStatus === 'partial'
    );
    
    // Якщо немає неоплачених звітів, повертаємо порожній масив
    if (unpaidReports.length === 0) return [];
    
    // Групуємо звіти за клієнтами
    const clientReports = new Map<string, any[]>();
    
    unpaidReports.forEach(report => {
      const clientId = report.clientId || report.client_id || '';
      if (!clientReports.has(clientId)) {
        clientReports.set(clientId, []);
      }
      clientReports.get(clientId)?.push(report);
    });
    
    // Створюємо зведені звіти для кожного клієнта
    const consolidatedReports = Array.from(clientReports.entries()).map(([clientId, clientReports]) => {
      if (clientReports.length === 0) return null;
      
      // Беремо дані першого звіту для клієнта
      const firstReport = clientReports[0];
      
      // Підсумовуємо дані
      let totalHours = 0;
      let totalEarned = 0;
      let paidAmount = 0;
      let remainingAmount = 0;
      
      clientReports.forEach(report => {
        totalHours += report.totalHours || 0;
        totalEarned += report.totalEarned || 0;
        paidAmount += report.paidAmount || 0;
        remainingAmount += report.remainingAmount || 0;
      });
      
      // Визначаємо статус (якщо є неповністю оплачені, то partial, інакше unpaid)
      let paymentStatus = 'unpaid';
      if (paidAmount > 0) {
        paymentStatus = 'partial';
      }
      
      return {
        ...firstReport,
        id: `consolidated-${clientId}`, // Унікальний ID для зведеного звіту
        clientId: clientId, // Зберігаємо ID клієнта
        totalHours,
        totalEarned,
        paidAmount,
        remainingAmount,
        paymentStatus,
        workDays: [] // Очищуємо робочі дні, оскільки це зведений звіт
      };
    }).filter(report => report !== null) as any[];
    
    // Сортуємо за сумою боргу (від більшого до меншого)
    return consolidatedReports.sort((a, b) => {
      // Спочатку сортуємо за залишком до оплати (від більшого до меншого)
      const amountDiff = b.remainingAmount - a.remainingAmount;
      if (amountDiff !== 0) return amountDiff;

      // Якщо суми однакові, сортуємо за статусом
      const paymentOrder = { unpaid: 0, partial: 1, paid: 2 };
      return paymentOrder[a.paymentStatus] - paymentOrder[b.paymentStatus];
    });
  }, [reports]);

  const unpaidSummary = useMemo(() => {
    let totalUnpaidAmount = 0;
    let totalUnpaidHours = 0;

    reports.forEach(report => {
      report.workDays.forEach(day => {
        const dayStatus = day.paymentStatus || day.payment_status;

        // Filter by worker if selected
        if (selectedWorkerId !== 'all') {
          const hasAssignment = day.assignments?.some(a =>
            a.worker_id === selectedWorkerId || a.workerId === selectedWorkerId
          );
          if (!hasAssignment) return; // Skip this day

          const assignment = day.assignments?.find(a =>
            a.worker_id === selectedWorkerId || a.workerId === selectedWorkerId
          );

          if (assignment) {
            const workerAmount = assignment.amount || 0;
            const workerHours = assignment.hours || 0;

            if (dayStatus === "unpaid") {
              totalUnpaidAmount += workerAmount;
              totalUnpaidHours += workerHours;
            } else if (dayStatus === "partial") {
              const dayPaid = day.day_paid_amount || 0;
              // Calculate worker's share of partial payment
              const workerShare = day.amount > 0 ? (workerAmount / day.amount) * dayPaid : 0;
              totalUnpaidAmount += (workerAmount - workerShare);

              const client = clients.find(c => c.id === report.clientId || c.id === report.client_id);
              if (client) {
                const hourlyRate = client.hourlyRate || client.hourly_rate || 0;
                if (hourlyRate > 0) {
                  const paidHours = workerShare / hourlyRate;
                  totalUnpaidHours += (workerHours - paidHours);
                }
              }
            }
          }
        } else {
          // Show all
          if (dayStatus === "unpaid") {
            totalUnpaidAmount += day.amount;
            totalUnpaidHours += day.hours;
          } else if (dayStatus === "partial") {
            const dayPaid = day.day_paid_amount || 0;
            totalUnpaidAmount += (day.amount - dayPaid);
            const client = clients.find(c => c.id === report.clientId || c.id === report.client_id);
            if (client) {
              const hourlyRate = client.hourlyRate || client.hourly_rate || 0;
              if (hourlyRate > 0) {
                const paidHours = dayPaid / hourlyRate;
                totalUnpaidHours += (day.hours - paidHours);
              }
            }
          }
        }
      });
    });

    return { totalUnpaidAmount, totalUnpaidHours };
  }, [reports, clients, selectedWorkerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground text-lg">Завантаження...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground text-lg mb-4">{error}</p>
          <Button onClick={loadData}>Спробувати знову</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 pt-4">
      {/* Fixed top section with glassmorphism */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl border-b border-white/10 shadow-[0_2px_16px_0_rgba(31,38,135,0.1)]">
        <div className="container mx-auto px-4 py-4">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Години блок */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 p-4 shadow-sm border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0 border border-purple-200 dark:border-purple-800">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Години</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-xl font-bold text-black dark:text-white">{decimalToHours(unpaidSummary.totalUnpaidHours)}</p>
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
                    <p className="text-xl font-bold text-amber-800 dark:text-amber-200">{Math.round(unpaidSummary.totalUnpaidAmount)}</p>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">€</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page Title */}
          <div className="text-center">
            <h1 className="text-xl font-bold text-amber-800 dark:text-amber-200">
              не оплатили
            </h1>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-40 pb-8 space-y-4">

        {/* Reports Grid */}
        {sortedReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-xl font-semibold text-foreground mb-2">Немає неоплачених звітів</p>
            <p className="text-muted-foreground text-sm">Всі звіти оплачені</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedReports.map((report, index) => (
              <ReportCard key={report.id} report={report} index={index} />
            ))}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default ReportsStatus;
