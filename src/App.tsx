import { AccountDataProvider } from "@/data/AccountDataProvider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Navigate, Outlet, useParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkerProvider } from "@/contexts/WorkerContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/ui/ErrorBoundary";
import { OfflineBanner } from "@/ui/OfflineBanner";
import { lazy, Suspense } from "react";
import { ScreenSkeleton } from "@/ui/Skeleton";
import { RouteError } from "@/ui/RouteError";
import { LanguageProvider } from "@/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
const Index = lazy(() => import("./pages/Index"));

const ReportsStatus = lazy(() => import("./pages/ReportsStatus"));
const SelectClient = lazy(() => import("./pages/SelectClient"));
const CreateReport = lazy(() => import("./pages/CreateReport"));
const WorkDayDetails = lazy(() => import("./pages/WorkDayDetails"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ClientManagement = lazy(() => import("./pages/ClientManagement"));
const ClientReports = lazy(() => import("./pages/ClientReports"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ReportDetails = lazy(() => import("./pages/ReportDetails"));

const LegacyDayRedirect = () => {
  const { dayId } = useParams();
  return <Navigate to={`/day/${dayId}`} replace />;
};

const router = createBrowserRouter(createRoutesFromElements(<Route element={<Outlet />} errorElement={<RouteError />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/reports-status" element={<ProtectedRoute><ReportsStatus /></ProtectedRoute>} />
              <Route path="/select-client" element={<ProtectedRoute><SelectClient /></ProtectedRoute>} />
              <Route path="/create-report" element={<ProtectedRoute><CreateReport /></ProtectedRoute>} />
              <Route path="/day/:dayId" element={<ProtectedRoute><WorkDayDetails /></ProtectedRoute>} />
              {/* Спадкові маршрути 2.x */}
              <Route path="/report/:reportId/day/:dayId" element={<LegacyDayRedirect />} />
              <Route path="/report/:id" element={<ProtectedRoute><ReportDetails /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/client-management" element={<ProtectedRoute><ClientManagement /></ProtectedRoute>} />
              <Route path="/client-reports/:clientId" element={<ProtectedRoute><ClientReports /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
</Route>));
const App = () => (
  <ErrorBoundary>
    <LanguageProvider>
    <AuthProvider>
      <AccountDataProvider>
          <WorkerProvider>
            <TooltipProvider delayDuration={200}>
            <Sonner position="top-center" />
            <OfflineBanner />
            <Suspense fallback={<ScreenSkeleton />}><RouterProvider router={router} /></Suspense>
            </TooltipProvider>
          </WorkerProvider>
      </AccountDataProvider>
    </AuthProvider>
    </LanguageProvider>
  </ErrorBoundary>
);
export default App;
