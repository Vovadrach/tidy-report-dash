import { Report } from "@/types/report";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ReportCardProps {
  report: Report;
}

export const ReportCard = ({ report }: ReportCardProps) => {
  const navigate = useNavigate();

  const getPaymentBadgeVariant = (status: Report["paymentStatus"]) => {
    switch (status) {
      case "paid":
        return "success";
      case "partial":
        return "warning";
      case "unpaid":
        return "destructive";
      default:
        return "default";
    }
  };

  const getPaymentLabel = (status: Report["paymentStatus"]) => {
    switch (status) {
      case "paid":
        return "Оплачено";
      case "partial":
        return "Частково";
      case "unpaid":
        return "Не оплачено";
      default:
        return status;
    }
  };

  return (
    <div
      onClick={() => navigate(`/report/${report.id}`)}
      className="bg-card rounded-2xl p-6 shadow-md hover:shadow-xl transition-smooth cursor-pointer border border-border hover:border-primary/50"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-bold text-foreground">{report.clientName}</h3>
        <Badge variant={getPaymentBadgeVariant(report.paymentStatus)}>
          {getPaymentLabel(report.paymentStatus)}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span className="text-sm">
            {report.totalHours} {report.totalHours === 1 ? "година" : "годин"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-success" />
          <span className="text-lg font-semibold text-foreground">
            {report.totalEarned.toFixed(2)} грн
          </span>
        </div>
      </div>
    </div>
  );
};
