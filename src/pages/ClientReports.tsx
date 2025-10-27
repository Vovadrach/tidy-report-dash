import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Report, WorkDay, Client } from "@/types/report";
import { Clock, Euro, CheckCircle2, XCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";

const ClientReports = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [unpaidWorkDays, setUnpaidWorkDays] = useState<Array<WorkDay & { reportId: string; reportDate: string }> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId]);

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
          // Додаємо тільки неоплачені та частково оплачені дні
          if (status === "unpaid" || status === "partial") {
            unpaidDays.push({
              ...day,
              reportId: report.id,
              reportDate: report.date
            });
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

  const getPaymentIcon = (status: WorkDay["paymentStatus"]) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "partial":
        return <AlertCircle className="w-5 h-5 text-warning" />;
      case "unpaid":
        return <XCircle className="w-5 h-5 text-destructive" />;
    }
  };

  const getPaymentColor = (status: WorkDay["paymentStatus"]) => {
    switch (status) {
      case "paid":
        return "text-success";
      case "partial":
        return "text-warning";
      case "unpaid":
        return "text-destructive";
      default:
        return "text-foreground";
    }
  };

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
        {/* Work Days List */}
        {unpaidWorkDays.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-center text-muted-foreground">Всі робочі дні оплачені</p>
          </div>
        ) : (
          unpaidWorkDays.map((day) => (
            <div
              key={`${day.reportId}-${day.id}`}
              onClick={() => navigate(`/report/${day.reportId}/day/${day.id}`)}
              className="bg-card rounded-xl p-4 shadow-sm border border-border cursor-pointer hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-foreground">
                  {new Date(day.reportDate).toLocaleDateString("uk-UA")}
                </p>

                <div className="flex items-center gap-2">
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                    <Euro className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-black dark:text-white text-sm">{Math.round(day.amount)}€</span>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-950 rounded-lg px-3 py-1.5 flex items-center gap-1.5 border-2 border-orange-400 dark:border-orange-600">
                    <span className="text-xs text-muted-foreground">Винні:</span>
                    <span className="font-semibold text-black dark:text-white text-sm">{Math.round(day.amount - (day.day_paid_amount || 0))}€</span>
                  </div>
                </div>
              </div>

              {day.note && (
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                  📝 {day.note}
                </p>
              )}
            </div>
          ))
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default ClientReports;