import { Report } from "@/types/report";
import { Clock, Euro } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { decimalToHours } from "@/utils/timeFormat";

interface ReportCardProps {
  report: Report;
  index?: number;
}

export const ReportCard = ({ report }: ReportCardProps) => {
  const navigate = useNavigate();

  const remainingAmount = Math.round((report.totalEarned || report.total_earned || 0) - (report.paidAmount || report.paid_amount || 0));
  const totalHours = report.totalHours || report.total_hours || 0;

  return (
    <div
      onClick={() => {
        // Якщо це зведений звіт (має префікс consolidated-), переходимо на сторінку з усіма робочими днями клієнта
        if (report.id?.startsWith('consolidated-')) {
          navigate(`/client-reports/${report.clientId}`);
        } else {
          navigate(`/report/${report.id}`);
        }
      }}
      className="surface-card surface-card-hover p-4 cursor-pointer"
    >
      <div className="text-center mb-3">
        <p className="text-base font-bold text-foreground truncate">
          {report.clientName || report.client_name || 'Без імені'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="chip chip-violet py-2 text-sm">
          <Clock className="w-4 h-4" />
          <span>{decimalToHours(totalHours)}</span>
        </div>

        <div className="chip chip-amber py-2 text-sm">
          <Euro className="w-4 h-4" />
          <span>{remainingAmount}€</span>
        </div>
      </div>
    </div>
  );
};
