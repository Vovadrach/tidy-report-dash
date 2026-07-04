import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { IconContext } from "@phosphor-icons/react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkerProvider } from "@/contexts/WorkerContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/ui/ErrorBoundary";
import { OfflineBanner } from "@/ui/OfflineBanner";
import { lazy, Suspense } from "react";
import { ScreenSkeleton } from "@/ui/Skeleton";
import Index from "./pages/Index";

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

const LegacyDayRedirect = () => {
  const { dayId } = useParams();
  return <Navigate to={`/day/${dayId}`} replace />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      // Офлайн-старт: кеш живе довго, мережа освіжає фоном
      gcTime: 7 * 24 * 60 * 60 * 1000,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "aria-query-cache",
});

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister, buster: __APP_VERSION__, maxAge: 7 * 24 * 60 * 60 * 1000 }}
  >
    <IconContext.Provider value={{ weight: "regular" }}>
    <AuthProvider>
      <WorkerProvider>
        <ErrorBoundary>
          <Sonner />
          <OfflineBanner />
          <BrowserRouter>
            <Suspense fallback={<ScreenSkeleton />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/reports-status" element={<ProtectedRoute><ReportsStatus /></ProtectedRoute>} />
              <Route path="/select-client" element={<ProtectedRoute><SelectClient /></ProtectedRoute>} />
              <Route path="/create-report" element={<ProtectedRoute><CreateReport /></ProtectedRoute>} />
              <Route path="/day/:dayId" element={<ProtectedRoute><WorkDayDetails /></ProtectedRoute>} />
              {/* Спадкові маршрути 2.x */}
              <Route path="/report/:reportId/day/:dayId" element={<LegacyDayRedirect />} />
              <Route path="/report/:id" element={<Navigate to="/" replace />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/client-management" element={<ProtectedRoute><ClientManagement /></ProtectedRoute>} />
              <Route path="/client-reports/:clientId" element={<ProtectedRoute><ClientReports /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </ErrorBoundary>
      </WorkerProvider>
    </AuthProvider>
    </IconContext.Provider>
  </PersistQueryClientProvider>
);

export default App;
