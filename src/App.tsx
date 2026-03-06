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
                <Route path="/employee-dashboard" element={<Dashboard />} />
                <Route path="/team" element={<Dashboard />} />
                <Route path="/invitations" element={<Dashboard />} />
                <Route path="/schedules" element={<Dashboard />} />
                <Route path="/contracts" element={<Dashboard />} />
                <Route path="/my-schedule" element={<Dashboard />} />
                <Route path="/settings" element={<Dashboard />} />
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
