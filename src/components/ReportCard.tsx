import { Report } from "@/types/report";
import { Clock, Euro } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { decimalToHours } from "@/utils/timeFormat";
import { motion } from "motion/react";
import NumberFlow from "@number-flow/react";

interface ReportCardProps {
  report: Report;
  index?: number;
}

export const ReportCard = ({ report, index = 0 }: ReportCardProps) => {
  const navigate = useNavigate();

  const remainingAmount = Math.round(
    (report.totalEarned || report.total_earned || 0) - (report.paidAmount || report.paid_amount || 0),
  );
  const totalHours = report.totalHours || report.total_hours || 0;

  const open = () => {
    if (report.id?.startsWith("consolidated-")) navigate(`/client-reports/${report.clientId}`);
    else navigate(`/report/${report.id}`);
  };

  return (
    <motion.button
      type="button"
      onClick={open}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.045, 0.3), ease: [0.22, 1, 0.36, 1], duration: 0.45 }}
      whileTap={{ scale: 0.975 }}
      className="glass-card w-full rounded-xl p-4 text-left"
    >
      <p className="mb-3 text-center text-base font-semibold text-foreground">
        {report.clientName || report.client_name || "Без імені"}
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex items-center justify-center gap-1.5 rounded-lg border border-violet-200/60 bg-violet-50/70 py-2.5 dark:border-violet-800/40 dark:bg-violet-950/40">
          <Clock className="h-4 w-4 text-violet-500" strokeWidth={2.25} />
          <span className="num-display text-base text-violet-900 dark:text-violet-100">
            {decimalToHours(totalHours)}
          </span>
        </div>

        <div className="flex items-center justify-center gap-1 rounded-lg border border-amber-200/60 bg-amber-50/70 py-2.5 dark:border-amber-800/40 dark:bg-amber-950/40">
          <Euro className="h-4 w-4 text-amber-500" strokeWidth={2.25} />
          <span className="num-display text-base text-amber-900 dark:text-amber-100">
            <NumberFlow value={remainingAmount} />€
          </span>
        </div>
      </div>
    </motion.button>
  );
};
