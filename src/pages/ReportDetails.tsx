import { Navigate, useParams } from 'react-router-dom';
import { useWorkDays } from '@/data/queries';
import { ScreenSkeleton } from '@/ui/Skeleton';
import { QueryError } from '@/ui/QueryError';
export default function ReportDetails() {
  const { id } = useParams();
  const query = useWorkDays();
  if (query.isLoading) return <ScreenSkeleton />;
  if (query.isError && !query.data) return <QueryError onRetry={() => void query.refetch()} />;
  const days = query.data?.filter(d => d.reportId === id) ?? [];
  if (!days.length) return <QueryError message="Запис не знайдено" onRetry={() => void query.refetch()} />;
  if (days.length === 1) return <Navigate to={`/day/${days[0].id}`} replace />;
  return <Navigate to={`/client-reports/${days[0].clientId}`} replace />;
}
