import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IconContext } from "@phosphor-icons/react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkerProvider } from "@/contexts/WorkerContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import ReportsStatus from "./pages/ReportsStatus";
import SelectClient from "./pages/SelectClient";
import CreateReport from "./pages/CreateReport";
import WorkDayDetails from "./pages/WorkDayDetails";
import Dashboard from "./pages/Dashboard";
import ClientManagement from "./pages/ClientManagement";
import ClientReports from "./pages/ClientReports";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <IconContext.Provider value={{ weight: "regular" }}>
    <AuthProvider>
      <WorkerProvider>
        <>
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/reports-status" element={<ProtectedRoute><ReportsStatus /></ProtectedRoute>} />
              <Route path="/select-client" element={<ProtectedRoute><SelectClient /></ProtectedRoute>} />
              <Route path="/create-report" element={<ProtectedRoute><CreateReport /></ProtectedRoute>} />
              <Route path="/report/:reportId/day/:dayId" element={<ProtectedRoute><WorkDayDetails /></ProtectedRoute>} />
              {/* Спадковий маршрут звіту: окремий екран скасовано у 3.0 */}
              <Route path="/report/:id" element={<Navigate to="/" replace />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/client-management" element={<ProtectedRoute><ClientManagement /></ProtectedRoute>} />
              <Route path="/client-reports/:clientId" element={<ProtectedRoute><ClientReports /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </>
      </WorkerProvider>
    </AuthProvider>
    </IconContext.Provider>
  </QueryClientProvider>
);

export default App;
