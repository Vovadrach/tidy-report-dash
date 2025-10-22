import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DashboardButton } from "@/components/DashboardButton";
import { storage } from "@/lib/storage";
import { Client, Report, WorkDay, PaymentStatus } from "@/types/report";
import { ArrowLeft, Settings, Plus } from "lucide-react";
import { toast } from "sonner";

const CreateReport = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [workHours, setWorkHours] = useState("");
  const [workPaymentStatus, setWorkPaymentStatus] = useState<PaymentStatus>("unpaid");

  // Client management
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientRate, setNewClientRate] = useState("");

  useEffect(() => {
    setClients(storage.getClients());
  }, []);

  const handleAddClient = () => {
    if (!newClientName || !newClientRate) {
      toast.error("Заповніть всі поля клієнта");
      return;
    }

    const newClient: Client = {
      id: Date.now().toString(),
      name: newClientName,
      hourlyRate: parseFloat(newClientRate),
    };

    storage.addClient(newClient);
    setClients(storage.getClients());
    setSelectedClientId(newClient.id);
    setNewClientName("");
    setNewClientRate("");
    setIsClientDialogOpen(false);
    toast.success("Клієнта додано");
  };

  const handleCreateReport = () => {
    if (!selectedClientId) {
      toast.error("Оберіть клієнта");
      return;
    }

    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return;

    const workDays: WorkDay[] = [];
    
    if (workHours) {
      const hours = parseFloat(workHours);
      const amount = hours * client.hourlyRate;
      
      workDays.push({
        id: Date.now().toString(),
        date: reportDate,
        hours,
        amount,
        paymentStatus: workPaymentStatus,
      });
    }

    const totalHours = workDays.reduce((sum, day) => sum + day.hours, 0);
    const totalEarned = workDays.reduce((sum, day) => sum + day.amount, 0);
    const paidDays = workDays.filter((d) => d.paymentStatus === "paid");
    const paidAmount = paidDays.reduce((sum, day) => sum + day.amount, 0);

    let reportPaymentStatus: PaymentStatus = "unpaid";
    if (paidAmount === totalEarned && totalEarned > 0) {
      reportPaymentStatus = "paid";
    } else if (paidAmount > 0) {
      reportPaymentStatus = "partial";
    }

    const newReport: Report = {
      id: Date.now().toString(),
      clientId: client.id,
      clientName: client.name,
      date: reportDate,
      status: "in_progress",
      paymentStatus: reportPaymentStatus,
      totalHours,
      totalEarned,
      paidAmount,
      remainingAmount: totalEarned - paidAmount,
      workDays,
    };

    storage.addReport(newReport);
    toast.success("Звіт створено");
    navigate(`/report/${newReport.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-secondary pb-32">
      <header className="bg-card border-b border-border sticky top-0 z-30 shadow-md">
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Створити звіт</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-card rounded-2xl p-8 shadow-xl border border-border space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Клієнт</Label>
              <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Параметри
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Управління клієнтами</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Назва клієнта</Label>
                      <Input
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Введіть назву"
                      />
                    </div>
                    <div>
                      <Label>Ставка за годину (грн)</Label>
                      <Input
                        type="number"
                        value={newClientRate}
                        onChange={(e) => setNewClientRate(e.target.value)}
                        placeholder="Введіть ставку"
                      />
                    </div>
                    <Button onClick={handleAddClient} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Додати клієнта
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть клієнта" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} ({client.hourlyRate} грн/год)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">Дата звіту</Label>
            <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-semibold mb-4">Початковий робочий день (за бажанням)</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Години роботи</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={workHours}
                  onChange={(e) => setWorkHours(e.target.value)}
                  placeholder="Наприклад: 8"
                />
              </div>

              {workHours && selectedClientId && (
                <>
                  <div className="space-y-2">
                    <Label>Статус оплати</Label>
                    <Select value={workPaymentStatus} onValueChange={(v) => setWorkPaymentStatus(v as PaymentStatus)}>
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

                  <div className="bg-secondary/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Сума до виплати:</p>
                    <p className="text-2xl font-bold text-foreground">
                      {(parseFloat(workHours) * (clients.find((c) => c.id === selectedClientId)?.hourlyRate || 0)).toFixed(2)} грн
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <Button variant="gradient" size="lg" onClick={handleCreateReport} className="w-full">
            Зберегти звіт
          </Button>
        </div>
      </main>

      <DashboardButton />
    </div>
  );
};

export default CreateReport;
