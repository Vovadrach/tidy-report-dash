import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import ReportsStatus from "./pages/ReportsStatus";
import SelectClient from "./pages/SelectClient";
import CreateReport from "./pages/CreateReport";
import ReportDetails from "./pages/ReportDetails";
import WorkDayDetails from "./pages/WorkDayDetails";
import Dashboard from "./pages/Dashboard";
import ClientManagement from "./pages/ClientManagement";
import ClientReports from "./pages/ClientReports";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
