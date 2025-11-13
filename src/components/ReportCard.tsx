import { Report } from "@/types/report";
import { Clock, Euro, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { decimalToHours } from "@/utils/timeFormat";

interface ReportCardProps {
  report: Report;
  index?: number;
}

export const ReportCard = ({ report, index = 0 }: ReportCardProps) => {
  const navigate = useNavigate();

  const paymentStatus = report.paymentStatus || report.payment_status || "unpaid";
  const remainingAmount = Math.round((report.totalEarned || report.total_earned || 0) - (report.paidAmount || report.paid_amount || 0));
  const totalHours = report.totalHours || report.total_hours || 0;
  
  // Функція для визначення кольору в залежності від статусу оплати
  const getPaymentColor = () => {
    switch (paymentStatus) {
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

  return (
    <div
      onClick={() => {
        // Якщо це зведений звіт (має префікс consolidated-), переходимо на сторінку з усіма робочими днями клієнта
        if (report.id?.startsWith('consolidated-')) {
          // Переходимо на сторінку деталей звіту, але передаємо ID клієнта
          navigate(`/client-reports/${report.clientId}`);
        } else {
          navigate(`/report/${report.id}`);
        }
      }}
      className="bg-card rounded-lg p-4 shadow-md border border-border hover:shadow-lg transition-smooth cursor-pointer"
    >
      <div className="text-center mb-3">
        <p className="text-base font-semibold text-foreground">
          {report.clientName || report.client_name || 'Без імені'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-purple-50 dark:bg-purple-950 rounded-md p-2 flex items-center justify-center gap-1 border border-purple-200/50 dark:border-purple-800/50 shadow-md">
          <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <p className="text-base font-semibold text-black dark:text-white">{decimalToHours(totalHours)}</p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950 rounded-md p-2 flex items-center justify-center gap-1 border border-amber-200/50 dark:border-amber-800/50 shadow-md">
          <Euro className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <p className="text-base font-semibold text-amber-800 dark:text-amber-200">{remainingAmount}€</p>
        </div>
      </div>
    </div>
  );
};
