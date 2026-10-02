import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import Violations from "./pages/Violations";
import Cameras from "./pages/Cameras";
import Gates from "./pages/Gates";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import UploadProcess from "./pages/UploadProcess";
import FinesMaster from "./pages/FinesMaster";
import Challans from "./pages/Challans";
import PublicChallan from "./pages/PublicChallan";

// v2 (lives entirely under /v2 — v1 routes above are unchanged)
import { V2AuthProvider } from "./v2/lib/auth";
import V2Layout from "./v2/components/V2Layout";
import V2Login from "./v2/pages/V2Login";
import V2Overview from "./v2/pages/V2Overview";
import EvidenceLab from "./v2/pages/EvidenceLab";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="traffic-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/challan" element={<PublicChallan />} />

              {/* Protected dashboard routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="vehicles" element={<Vehicles />} />
                <Route path="violations" element={<Violations />} />
                <Route path="upload" element={<UploadProcess />} />
                <Route path="fines" element={<FinesMaster />} />
                <Route path="challans" element={<Challans />} />
                <Route path="cameras" element={<Cameras />} />
                <Route path="gates" element={<Gates />} />
                <Route
                  path="users"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <Users />
                    </ProtectedRoute>
                  }
                />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* v2 */}
              <Route path="/v2" element={<V2AuthProvider><Outlet /></V2AuthProvider>}>
                <Route path="login" element={<V2Login />} />
                <Route element={<V2Layout />}>
                  <Route index element={<V2Overview />} />
                  <Route path="evidence" element={<EvidenceLab />} />
                </Route>
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
