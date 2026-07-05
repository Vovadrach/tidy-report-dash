import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/ui/ErrorBoundary";
import { OfflineBanner } from "@/ui/OfflineBanner";
import { AppSheetsProvider } from "@/ui/AppSheets";
import { lazy, Suspense } from "react";
import { ScreenSkeleton } from "@/ui/Skeleton";
import Feed from "./pages/Feed";

const Clients = lazy(() => import("./pages/Clients"));
const ClientCard = lazy(() => import("./pages/ClientCard"));
const Money = lazy(() => import("./pages/Money"));
const Profile = lazy(() => import("./pages/Profile"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      gcTime: 7 * 24 * 60 * 60 * 1000,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "yasno-query-cache",
});

/** Авторизована зона: захист + глобальні листи, спільні для всіх вкладок. */
const ProtectedLayout = () => (
  <ProtectedRoute>
    <AppSheetsProvider>
      <Outlet />
    </AppSheetsProvider>
  </ProtectedRoute>
);

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister, buster: __APP_VERSION__, maxAge: 7 * 24 * 60 * 60 * 1000 }}
  >
    <AuthProvider>
      <ErrorBoundary>
        <Sonner />
        <OfflineBanner />
        <BrowserRouter>
          <Suspense fallback={<ScreenSkeleton />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Feed />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/client/:id" element={<ClientCard />} />
                <Route path="/money" element={<Money />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;
