import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { Report, Client } from "@/types/report";
import { Clock, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";

const ReportDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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

  const unpaidDays = report?.workDays.filter(day => {
    const status = day.paymentStatus || day.payment_status;
    return status !== "paid";
  }) || [];
  
  const unpaidAmount = unpaidDays.reduce((sum, day) => {
    const status = day.paymentStatus || day.payment_status;
    if (status === "unpaid") {
      return sum + day.amount;
    } else if (status === "partial") {
      const dayPaid = day.day_paid_amount || 0;
      return sum + (day.amount - dayPaid);
    }
    return sum;
  }, 0);
  
  const unpaidHours = unpaidDays.reduce((sum, day) => {
    const status = day.paymentStatus || day.payment_status;
    if (status === "unpaid") {
      return sum + day.hours;
    } else if (status === "partial") {
      const dayPaid = day.day_paid_amount || 0;
      const hourlyRate = client?.hourlyRate || client?.hourly_rate || 0;
      if (hourlyRate > 0) {
        const paidHours = dayPaid / hourlyRate;
        return sum + (day.hours - paidHours);
      }
    }
    return sum;
  }, 0);

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
        <div className="bg-card rounded-lg p-4 shadow-md border border-border">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-warning/10 rounded-md p-3 flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning" />
              <p className="text-lg font-bold text-warning">{Math.round(unpaidAmount)}€</p>
            </div>
            <div className="bg-primary/10 rounded-md p-3 flex items-center justify-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <p className="text-lg font-bold text-foreground">{unpaidHours.toFixed(1)}</p>
            </div>
          </div>
        </div>

        {/* Work Days - Only unpaid or partial */}
        <div className="bg-card rounded-lg p-6 shadow-md border border-border">
          <div className="space-y-3">
            {unpaidDays.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Всі робочі дні оплачені</p>
            ) : (
              unpaidDays.map((day) => (
                <div 
                  key={day.id} 
                  onClick={() => navigate(`/report/${report.id}/day/${day.id}`)}
                  className="bg-secondary/10 rounded-md p-3 border border-border cursor-pointer hover:shadow-md transition-smooth"
                >
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-semibold text-foreground">{new Date(day.date).toLocaleDateString("uk-UA")}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span className="font-semibold text-foreground">{day.hours}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-success" />
                        <span className="font-semibold text-success">{Math.round(day.amount)}€</span>
                      </div>
                    </div>
                  </div>
                  {day.note && <p className="text-xs text-muted-foreground mt-2">📝 {day.note}</p>}
                </div>
              ))
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
