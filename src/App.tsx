import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkerProvider } from "@/contexts/WorkerContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";

const ReportsStatus = lazy(() => import("./pages/ReportsStatus"));
const SelectClient = lazy(() => import("./pages/SelectClient"));
const CreateReport = lazy(() => import("./pages/CreateReport"));
const ReportDetails = lazy(() => import("./pages/ReportDetails"));
const WorkDayDetails = lazy(() => import("./pages/WorkDayDetails"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ClientManagement = lazy(() => import("./pages/ClientManagement"));
const ClientReports = lazy(() => import("./pages/ClientReports"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: true },
  },
});

const RouteFallback = () => (
  <div className="min-h-dvh bg-background" />
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WorkerProvider>
        <TooltipProvider delayDuration={200}>
          <Sonner position="top-center" />
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/reports-status" element={<ProtectedRoute><ReportsStatus /></ProtectedRoute>} />
                <Route path="/select-client" element={<ProtectedRoute><SelectClient /></ProtectedRoute>} />
                <Route path="/create-report" element={<ProtectedRoute><CreateReport /></ProtectedRoute>} />
                <Route path="/report/:id" element={<ProtectedRoute><ReportDetails /></ProtectedRoute>} />
                <Route path="/report/:reportId/day/:dayId" element={<ProtectedRoute><WorkDayDetails /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/client-management" element={<ProtectedRoute><ClientManagement /></ProtectedRoute>} />
                <Route path="/client-reports/:clientId" element={<ProtectedRoute><ClientReports /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </WorkerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
