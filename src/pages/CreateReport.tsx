import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { Client, Report, WorkDay, PaymentStatus } from "@/types/report";
import { User, Calendar, Clock, Plus, Euro, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const CreateReport = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [workHours, setWorkHours] = useState("");
  const [workPaymentStatus, setWorkPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [partialAmount, setPartialAmount] = useState("");
  const [customHourlyRate, setCustomHourlyRate] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  // Set client from URL parameter
  useEffect(() => {
    const clientIdFromUrl = searchParams.get('clientId');
    if (clientIdFromUrl) {
      setSelectedClientId(clientIdFromUrl);
    }
  }, [searchParams]);

  // Автоматично встановлюємо дефолтну ставку при виборі клієнта
  useEffect(() => {
    if (selectedClientId && clients.length > 0) {
      const defaultRate = getDefaultHourlyRate();
      setCustomHourlyRate(defaultRate.toString());
    } else if (!selectedClientId) {
      setCustomHourlyRate("");
    }
  }, [selectedClientId, clients]);

  const loadClients = async () => {
    try {
      const data = await api.getClients();
      setClients(data);
    } catch (error) {
      toast.error('Помилка завантаження клієнтів');
    }
  };

  const getClientHourlyRate = () => {
    // Якщо є кастомна ставка, використовуємо її
    if (customHourlyRate) {
      return parseFloat(customHourlyRate);
    }
    const client = clients.find((c) => c.id === selectedClientId);
    return client ? (client.hourlyRate || client.hourly_rate || 0) : 0;
  };

  const getDefaultHourlyRate = () => {
    const client = clients.find((c) => c.id === selectedClientId);
    return client ? (client.hourlyRate || client.hourly_rate || 0) : 0;
  };

  const calculateEarnings = () => {
    if (!workHours || !selectedClientId) return 0;
    const hours = parseFloat(workHours);
    const rate = getClientHourlyRate();
    return Math.round(hours * rate);
  };

  const handleCreateReport = async () => {
    if (!selectedClientId) {
      toast.error("Оберіть клієнта");
      return;
    }

    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return;

    const workDays: WorkDay[] = [];
    
    if (workHours) {
      const hours = parseFloat(workHours);
      const hourlyRate = client.hourlyRate || client.hourly_rate || 0;
      const amount = hours * hourlyRate;
      
      workDays.push({
        id: `new-${Date.now()}`,
        date: reportDate,
        hours,
        amount,
        paymentStatus: workPaymentStatus,
        day_paid_amount: workPaymentStatus === "partial" ? parseFloat(partialAmount) || 0 : 
                         workPaymentStatus === "paid" ? amount : 0
      });
    }

    const totalHours = workDays.reduce((sum, day) => sum + day.hours, 0);
    const totalEarned = workDays.reduce((sum, day) => sum + day.amount, 0);
    const paidDays = workDays.filter((d) => d.paymentStatus === "paid");
    const paidAmount = paidDays.reduce((sum, day) => sum + day.amount, 0);
    
    // Add partial payments
    const partialDays = workDays.filter((d) => d.paymentStatus === "partial");
    const partialAmountTotal = partialDays.reduce((sum, day) => sum + (day.day_paid_amount || 0), 0);
    
    const totalPaidAmount = paidAmount + partialAmountTotal;

    let reportPaymentStatus: PaymentStatus = "unpaid";
    if (totalPaidAmount === totalEarned && totalEarned > 0) {
      reportPaymentStatus = "paid";
    } else if (totalPaidAmount > 0) {
      reportPaymentStatus = "partial";
    }

    try {
      const newReport = await api.addReport({
        clientId: client.id,
        clientName: client.name,
        date: reportDate,
        status: "in_progress",
        paymentStatus: reportPaymentStatus,
        totalHours,
        totalEarned,
        paidAmount: totalPaidAmount,
        remainingAmount: totalEarned - totalPaidAmount,
        workDays,
      } as Omit<Report, 'id'>);

      toast.success("Звіт створено");
      navigate(`/`);
    } catch (error) {
      toast.error('Помилка створення звіту');
      console.error(error);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="min-h-screen bg-background pb-32 pt-4">
      {/* Fixed top section with client info */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl border-b border-white/10 shadow-[0_2px_16px_0_rgba(31,38,135,0.1)]">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-foreground text-center">
            {selectedClient?.name || "Завантаження..."}
          </h1>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-24 max-w-md">
        <div className="space-y-4">
          {/* Date Card */}
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 flex items-center justify-center flex-shrink-0 border border-green-200/60 dark:border-green-700/60">
                <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="flex-1 h-10 rounded-md border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
              />
            </div>
          </div>

          {/* Hours and Rate Card */}
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="grid grid-cols-2 gap-3">
              {/* Hours Input */}
              <div className="flex items-center gap-2 p-2 rounded-lg border-2 border-purple-200/60 dark:border-purple-700/60">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 flex items-center justify-center flex-shrink-0 border border-purple-200/60 dark:border-purple-700/60">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <Input
                  type="number"
                  step="0.5"
                  value={workHours}
                  onChange={(e) => setWorkHours(e.target.value)}
                  placeholder="0"
                  className="flex-1 h-10 text-base rounded-md border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {/* Rate Input */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 flex items-center justify-center flex-shrink-0 border border-blue-200/60 dark:border-blue-700/60">
                  <Euro className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <Input
                  type="number"
                  step="0.5"
                  value={customHourlyRate}
                  onChange={(e) => setCustomHourlyRate(e.target.value)}
                  placeholder="0"
                  className="flex-1 h-10 text-base rounded-md"
                />
              </div>
            </div>

            {workHours && selectedClientId && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Сума:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{calculateEarnings()}</span>
                    <span className="text-base font-semibold text-blue-600 dark:text-blue-400">€</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Status Selection */}
          {workHours && selectedClientId && (
            <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
              <div className="grid grid-cols-3 gap-2">
                {/* Paid Button */}
                <button
                  onClick={() => setWorkPaymentStatus("paid")}
                  className={`h-12 rounded-xl font-semibold transition-all backdrop-blur-sm ${
                    workPaymentStatus === "paid"
                      ? "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 text-green-800 dark:text-green-100 shadow-[0_4px_16px_0_rgba(34,197,94,0.25)] border border-green-300/60 dark:border-green-600/60"
                      : "bg-green-50/30 dark:bg-green-950/20 text-green-600/60 dark:text-green-400/60 border border-green-200/30 dark:border-green-800/30 hover:bg-green-50/50 dark:hover:bg-green-950/30"
                  }`}
                >
                  Оплачено
                </button>

                {/* Unpaid Button */}
                <button
                  onClick={() => setWorkPaymentStatus("unpaid")}
                  className={`h-12 rounded-xl font-semibold transition-all backdrop-blur-sm ${
                    workPaymentStatus === "unpaid"
                      ? "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 text-red-800 dark:text-red-100 shadow-[0_4px_16px_0_rgba(239,68,68,0.25)] border border-red-300/60 dark:border-red-600/60"
                      : "bg-red-50/30 dark:bg-red-950/20 text-red-600/60 dark:text-red-400/60 border border-red-200/30 dark:border-red-800/30 hover:bg-red-50/50 dark:hover:bg-red-950/30"
                  }`}
                >
                  Не оплачено
                </button>

                {/* Partial Button */}
                <button
                  onClick={() => setWorkPaymentStatus("partial")}
                  className={`h-12 rounded-xl font-semibold transition-all backdrop-blur-sm ${
                    workPaymentStatus === "partial"
                      ? "bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 text-orange-800 dark:text-orange-100 shadow-[0_4px_16px_0_rgba(249,115,22,0.25)] border border-orange-300/60 dark:border-orange-600/60"
                      : "bg-orange-50/30 dark:bg-orange-950/20 text-orange-600/60 dark:text-orange-400/60 border border-orange-200/30 dark:border-orange-800/30 hover:bg-orange-50/50 dark:hover:bg-orange-950/30"
                  }`}
                >
                  Частково
                </button>
              </div>

              {workPaymentStatus === "partial" && (
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    type="number"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="0"
                    className="h-10 flex-1 rounded-md"
                  />
                  <div className="w-10 h-10 rounded-md bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                    <Euro className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <Button
            variant="default"
            size="lg"
            onClick={handleCreateReport}
            className="w-full h-14 text-base font-bold rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-lg hover:shadow-xl"
            disabled={!selectedClientId || (workPaymentStatus === "partial" && !partialAmount)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Створити запис
          </Button>
        </div>
      </main>

      {/* Gradient fade effect for back button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none h-40">
        {/* Плавний градієнт розмиття - від сильного до відсутнього */}
        <div
          className="absolute inset-0 backdrop-blur-xl"
          style={{
            maskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)'
          }}
        ></div>

        {/* Градієнтний фон */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 via-40% to-transparent"></div>
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 dark:from-blue-950 dark:to-blue-900 text-blue-700 dark:text-blue-300 px-8 py-4 rounded-full shadow-md hover:shadow-lg transition-all backdrop-blur-sm border border-blue-200/60 dark:border-blue-700/60 pointer-events-auto"
      >
        <div className="flex items-center gap-2">
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          <span className="font-semibold text-base">Назад</span>
        </div>
      </button>
    </div>
  );
};

export default CreateReport;
