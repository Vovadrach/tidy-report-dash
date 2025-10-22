import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DashboardButton } from "@/components/DashboardButton";
import { storage } from "@/lib/storage";
import { Report, WorkDay, PaymentStatus, Client } from "@/types/report";
import { ArrowLeft, Plus, Clock, DollarSign, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

const ReportDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [isAddDayDialogOpen, setIsAddDayDialogOpen] = useState(false);
  
  // New work day fields
  const [newDayDate, setNewDayDate] = useState(new Date().toISOString().split("T")[0]);
  const [newDayHours, setNewDayHours] = useState("");
  const [newDayPaymentStatus, setNewDayPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [newDayNote, setNewDayNote] = useState("");

  useEffect(() => {
    if (id) {
      const loadedReport = storage.getReports().find((r) => r.id === id);
      if (loadedReport) {
        setReport(loadedReport);
        setPaidAmount(loadedReport.paidAmount.toString());
        
        const loadedClient = storage.getClients().find((c) => c.id === loadedReport.clientId);
        setClient(loadedClient || null);
      }
    }
  }, [id]);

  const recalculateReport = (updatedReport: Report) => {
    const totalHours = updatedReport.workDays.reduce((sum, day) => sum + day.hours, 0);
    const totalEarned = updatedReport.workDays.reduce((sum, day) => sum + day.amount, 0);
    
    const paid = parseFloat(paidAmount) || 0;
    const remaining = totalEarned - paid;

    let paymentStatus: PaymentStatus = "unpaid";
    if (paid >= totalEarned && totalEarned > 0) {
      paymentStatus = "paid";
    } else if (paid > 0) {
      paymentStatus = "partial";
    }

    return {
      ...updatedReport,
      totalHours,
      totalEarned,
      paidAmount: paid,
      remainingAmount: remaining,
      paymentStatus,
    };
  };

  const handleUpdatePayment = () => {
    if (!report) return;

    const updated = recalculateReport(report);
    storage.updateReport(report.id, updated);
    setReport(updated);
    toast.success("Оплату оновлено");
  };

  const handleAddWorkDay = () => {
    if (!report || !client || !newDayHours) {
      toast.error("Заповніть всі поля");
      return;
    }

    const hours = parseFloat(newDayHours);
    const amount = hours * client.hourlyRate;

    const newDay: WorkDay = {
      id: Date.now().toString(),
      date: newDayDate,
      hours,
      amount,
      paymentStatus: newDayPaymentStatus,
      note: newDayNote,
    };

    const updatedReport = {
      ...report,
      workDays: [...report.workDays, newDay],
    };

    const recalculated = recalculateReport(updatedReport);
    storage.updateReport(report.id, recalculated);
    setReport(recalculated);

    setNewDayDate(new Date().toISOString().split("T")[0]);
    setNewDayHours("");
    setNewDayPaymentStatus("unpaid");
    setNewDayNote("");
    setIsAddDayDialogOpen(false);
    toast.success("Робочий день додано");
  };

  const handleDeleteWorkDay = (dayId: string) => {
    if (!report) return;

    const updatedReport = {
      ...report,
      workDays: report.workDays.filter((d) => d.id !== dayId),
    };

    const recalculated = recalculateReport(updatedReport);
    storage.updateReport(report.id, recalculated);
    setReport(recalculated);
    toast.success("Робочий день видалено");
  };

  const handleCompleteReport = () => {
    if (!report) return;

    if (report.remainingAmount > 0) {
      toast.error("Не можна завершити звіт з боргом");
      return;
    }

    const allPaid = report.workDays.every((d) => d.paymentStatus === "paid");
    if (!allPaid) {
      toast.error("Не всі дні оплачені");
      return;
    }

    storage.updateReport(report.id, { status: "completed" });
    toast.success("Звіт завершено");
    navigate("/");
  };

  const getPaymentBadgeVariant = (status: PaymentStatus) => {
    switch (status) {
      case "paid": return "success";
      case "partial": return "warning";
      case "unpaid": return "destructive";
    }
  };

  const getPaymentLabel = (status: PaymentStatus) => {
    switch (status) {
      case "paid": return "Оплачено";
      case "partial": return "Частково";
      case "unpaid": return "Не оплачено";
    }
  };

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <p className="text-muted-foreground">Завантаження...</p>
      </div>
    );
  }

  const canComplete = report.remainingAmount === 0 && report.workDays.every((d) => d.paymentStatus === "paid");

  return (
    <div className="min-h-screen bg-gradient-secondary pb-32">
      <header className="bg-card border-b border-border sticky top-0 z-30 shadow-md">
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{report.clientName}</h1>
              <Badge variant={getPaymentBadgeVariant(report.paymentStatus)}>
                {getPaymentLabel(report.paymentStatus)}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Summary */}
        <div className="bg-card rounded-2xl p-8 shadow-xl border border-border">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5" />
                <span className="text-sm">Всього годин</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{report.totalHours}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-5 h-5" />
                <span className="text-sm">Зароблено</span>
              </div>
              <p className="text-3xl font-bold text-success">{report.totalEarned.toFixed(2)} грн</p>
            </div>
          </div>

          <div className="space-y-4 border-t border-border pt-6">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Сплачено (грн)</Label>
              <Input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="Введіть суму"
              />
            </div>

            <div className="bg-secondary/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Залишок:</p>
              <p className="text-2xl font-bold text-foreground">
                {(report.totalEarned - (parseFloat(paidAmount) || 0)).toFixed(2)} грн
              </p>
            </div>

            <Button onClick={handleUpdatePayment} className="w-full">
              Оновити оплату
            </Button>
          </div>
        </div>

        {/* Work Days */}
        <div className="bg-card rounded-2xl p-8 shadow-xl border border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Робочі дні</h2>
            <Dialog open={isAddDayDialogOpen} onOpenChange={setIsAddDayDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="gradient">
                  <Plus className="w-4 h-4 mr-2" />
                  Додати день
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Додати робочий день</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Дата</Label>
                    <Input type="date" value={newDayDate} onChange={(e) => setNewDayDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Години</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={newDayHours}
                      onChange={(e) => setNewDayHours(e.target.value)}
                      placeholder="Наприклад: 8"
                    />
                  </div>
                  <div>
                    <Label>Статус оплати</Label>
                    <Select value={newDayPaymentStatus} onValueChange={(v) => setNewDayPaymentStatus(v as PaymentStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Не оплачено</SelectItem>
                        <SelectItem value="partial">Частково</SelectItem>
                        <SelectItem value="paid">Оплачено</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Нотатка (опціонально)</Label>
                    <Input value={newDayNote} onChange={(e) => setNewDayNote(e.target.value)} placeholder="Додайте нотатку" />
                  </div>
                  <Button onClick={handleAddWorkDay} className="w-full">
                    Додати
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {report.workDays.map((day) => (
              <div key={day.id} className="bg-secondary/30 rounded-xl p-4 border border-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-foreground">{new Date(day.date).toLocaleDateString("uk-UA")}</p>
                    <Badge variant={getPaymentBadgeVariant(day.paymentStatus)} className="mt-2">
                      {getPaymentLabel(day.paymentStatus)}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteWorkDay(day.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Години: </span>
                    <span className="font-semibold text-foreground">{day.hours}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Сума: </span>
                    <span className="font-semibold text-success">{day.amount.toFixed(2)} грн</span>
                  </div>
                </div>
                {day.note && <p className="text-sm text-muted-foreground mt-2">📝 {day.note}</p>}
              </div>
            ))}
          </div>
        </div>

        {canComplete && (
          <Button variant="gradient" size="lg" onClick={handleCompleteReport} className="w-full">
            Завершити звіт
          </Button>
        )}
      </main>

      <DashboardButton />
    </div>
  );
};

export default ReportDetails;
