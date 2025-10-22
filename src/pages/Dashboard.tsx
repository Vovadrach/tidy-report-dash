import { useState, useEffect, useMemo } from "react";
import { ReportsButton } from "@/components/ReportsButton";
import { storage } from "@/lib/storage";
import { Report, Client } from "@/types/report";
import { DollarSign, Clock, TrendingUp, Users } from "lucide-react";

const Dashboard = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedClientId, setSelectedClientId] = useState<string>("all");

  useEffect(() => {
    setReports(storage.getReports());
    setClients(storage.getClients());
  }, []);

  const filteredReports = useMemo(() => {
    let filtered = [...reports];

    // Filter by client
    if (selectedClientId !== "all") {
      filtered = filtered.filter((r) => r.clientId === selectedClientId);
    }

    // Filter by period
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    if (selectedPeriod === "month") {
      filtered = filtered.filter((r) => new Date(r.date) >= startOfMonth);
    } else if (selectedPeriod === "year") {
      filtered = filtered.filter((r) => new Date(r.date) >= startOfYear);
    }

    return filtered;
  }, [reports, selectedClientId, selectedPeriod]);

  const stats = useMemo(() => {
    const totalEarned = filteredReports.reduce((sum, r) => sum + r.totalEarned, 0);
    const totalPaid = filteredReports.reduce((sum, r) => sum + r.paidAmount, 0);
    const totalRemaining = filteredReports.reduce((sum, r) => sum + r.remainingAmount, 0);
    const totalHours = filteredReports.reduce((sum, r) => sum + r.totalHours, 0);

    return {
      totalEarned,
      totalPaid,
      totalRemaining,
      totalHours,
    };
  }, [filteredReports]);

  const clientLeaderboard = useMemo(() => {
    const clientStats = new Map<string, { name: string; earned: number; hours: number }>();

    filteredReports.forEach((report) => {
      const existing = clientStats.get(report.clientId) || { name: report.clientName, earned: 0, hours: 0 };
      clientStats.set(report.clientId, {
        name: report.clientName,
        earned: existing.earned + report.totalEarned,
        hours: existing.hours + report.totalHours,
      });
    });

    return Array.from(clientStats.values()).sort((a, b) => b.earned - a.earned);
  }, [filteredReports]);

  const debtsBreakdown = useMemo(() => {
    const debts = new Map<string, { name: string; remaining: number }>();

    filteredReports
      .filter((r) => r.remainingAmount > 0)
      .forEach((report) => {
        const existing = debts.get(report.clientId) || { name: report.clientName, remaining: 0 };
        debts.set(report.clientId, {
          name: report.clientName,
          remaining: existing.remaining + report.remainingAmount,
        });
      });

    return Array.from(debts.values()).sort((a, b) => b.remaining - a.remaining);
  }, [filteredReports]);

  return (
    <div className="min-h-screen bg-gradient-secondary pb-32 pt-24">
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex gap-3">
        <button
          onClick={() => setSelectedPeriod("month")}
          className={`glass-effect px-6 py-3 rounded-full shadow-xl hover:shadow-glow transition-smooth ${
            selectedPeriod === "month" ? "ring-2 ring-primary" : ""
          }`}
        >
          <span className="font-semibold text-foreground">Цей місяць</span>
        </button>
        <button
          onClick={() => setSelectedClientId("all")}
          className={`glass-effect px-6 py-3 rounded-full shadow-xl hover:shadow-glow transition-smooth ${
            selectedClientId === "all" ? "ring-2 ring-primary" : ""
          }`}
        >
          <span className="font-semibold text-foreground">Всі клієнти</span>
        </button>
      </div>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Зароблено</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats.totalEarned.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">грн</p>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-success/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <p className="text-sm text-muted-foreground">Сплачено</p>
            </div>
            <p className="text-3xl font-bold text-success">{stats.totalPaid.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">грн</p>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-warning/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-warning" />
              </div>
              <p className="text-sm text-muted-foreground">Залишок</p>
            </div>
            <p className="text-3xl font-bold text-warning">{stats.totalRemaining.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">грн</p>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground">Години</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats.totalHours}</p>
            <p className="text-xs text-muted-foreground mt-1">годин</p>
          </div>
        </div>


        {/* Client Leaderboard */}
        <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Топ клієнтів</h2>
          </div>
          <div className="space-y-3">
            {clientLeaderboard.slice(0, 5).map((client, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                    {index + 1}
                  </div>
                  <span className="font-semibold text-foreground">{client.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-success">{client.earned.toFixed(2)} грн</p>
                  <p className="text-xs text-muted-foreground">{client.hours} год</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Debts Breakdown */}
        {debtsBreakdown.length > 0 && (
          <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
            <h2 className="text-xl font-bold text-foreground mb-6">Борги по клієнтах</h2>
            <div className="space-y-3">
              {debtsBreakdown.map((debt, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-warning/10 rounded-xl border border-warning/20">
                  <span className="font-semibold text-foreground">{debt.name}</span>
                  <span className="font-bold text-warning">{debt.remaining.toFixed(2)} грн</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      <ReportsButton />
    </div>
  );
};

export default Dashboard;
