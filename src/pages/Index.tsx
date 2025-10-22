import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardButton } from "@/components/DashboardButton";
import { CreateReportButton } from "@/components/CreateReportButton";
import { ReportCard } from "@/components/ReportCard";
import { storage } from "@/lib/storage";
import { Report } from "@/types/report";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    const loadedReports = storage.getReports();
    setReports(loadedReports);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-secondary pb-32 pt-24">
      <CreateReportButton />

      <main className="container mx-auto px-4 py-8">
        {reports.length === 0 ? (
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
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </main>

      <DashboardButton />
    </div>
  );
};

export default Index;
