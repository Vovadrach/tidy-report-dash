import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DashboardButton } from "@/components/DashboardButton";
import { ReportCard } from "@/components/ReportCard";
import { FilterPanel, FilterState } from "@/components/FilterPanel";
import { storage } from "@/lib/storage";
import { Report, Client } from "@/types/report";
import { Filter, Plus, FileText } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const loadedReports = storage.getReports();
    const loadedClients = storage.getClients();
    setReports(loadedReports);
    setFilteredReports(loadedReports);
    setClients(loadedClients);
  }, []);

  const handleApplyFilters = (filters: FilterState) => {
    let filtered = [...reports];

    if (filters.paymentStatuses.length > 0) {
      filtered = filtered.filter((r) => filters.paymentStatuses.includes(r.paymentStatus));
    }

    if (filters.clientId && filters.clientId !== "all") {
      filtered = filtered.filter((r) => r.clientId === filters.clientId);
    }

    if (filters.month !== undefined) {
      filtered = filtered.filter((r) => {
        const reportDate = new Date(r.date);
        return reportDate.getMonth() === filters.month;
      });
    }

    if (filters.year !== undefined) {
      filtered = filtered.filter((r) => {
        const reportDate = new Date(r.date);
        return reportDate.getFullYear() === filters.year;
      });
    }

    setFilteredReports(filtered);
  };

  return (
    <div className="min-h-screen bg-gradient-secondary pb-32">
      <header className="bg-card border-b border-border sticky top-0 z-30 shadow-md">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground mb-6">Звіти</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsFilterOpen(true)} className="flex-1">
              <Filter className="w-4 h-4 mr-2" />
              Фільтри
            </Button>
            <Button variant="gradient" onClick={() => navigate("/create-report")} className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              Створити звіт
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-secondary/50 rounded-full p-8 mb-6">
              <FileText className="w-16 h-16 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Ще немає звітів</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Створіть свій перший звіт, щоб почати відстежувати роботу та оплату
            </p>
            <Button variant="gradient" size="lg" onClick={() => navigate("/create-report")}>
              <Plus className="w-5 h-5 mr-2" />
              Створити перший звіт
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </main>

      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        clients={clients}
        onApply={handleApplyFilters}
      />

      <DashboardButton />
    </div>
  );
};

export default Index;
