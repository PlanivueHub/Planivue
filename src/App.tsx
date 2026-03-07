import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RoleRedirect from "@/components/auth/RoleRedirect";
import AppLayout from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import SaasOwnerDashboard from "./pages/SaasOwnerDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import InvitationsPage from "./pages/InvitationsPage";
import AcceptInvitation from "./pages/AcceptInvitation";
import TeamPage from "./pages/TeamPage";
import SchedulesPage from "./pages/SchedulesPage";
import MySchedulePage from "./pages/MySchedulePage";
import ContractsPage from "./pages/ContractsPage";
import AvailabilityPage from "./pages/AvailabilityPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/invite/:token" element={<AcceptInvitation />} />

              {/* Authenticated routes with layout */}
              <Route element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/saas-dashboard" element={
                  <ProtectedRoute roles={['saas_owner']}>
                    <SaasOwnerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/employee-dashboard" element={
                  <ProtectedRoute roles={['client_employee']}>
                    <EmployeeDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/team" element={
                  <ProtectedRoute roles={['client_admin']}>
                    <TeamPage />
                  </ProtectedRoute>
                } />
                <Route path="/invitations" element={
                  <ProtectedRoute roles={['client_admin']}>
                    <InvitationsPage />
                  </ProtectedRoute>
                } />
                <Route path="/schedules" element={
                  <ProtectedRoute roles={['client_admin', 'client_manager']}>
                    <SchedulesPage />
                  </ProtectedRoute>
                } />
                <Route path="/contracts" element={
                  <ProtectedRoute roles={['client_admin', 'client_manager']}>
                    <ContractsPage />
                  </ProtectedRoute>
                } />
                <Route path="/my-schedule" element={
                  <ProtectedRoute roles={['client_employee']}>
                    <MySchedulePage />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Root redirect */}
              <Route path="/" element={<RoleRedirect />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
