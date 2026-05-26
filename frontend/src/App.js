import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import "@/index.css";

import ClientValidation from "@/pages/ClientValidation";
import ProposalView from "@/pages/ProposalView";
import AdminLogin from "@/pages/admin/Login";
import AdminShell from "@/pages/admin/AdminShell";
import Dashboard from "@/pages/admin/Dashboard";
import Companies from "@/pages/admin/Companies";
import CompanyForm from "@/pages/admin/CompanyForm";
import Proposals from "@/pages/admin/Proposals";
import ProposalForm from "@/pages/admin/ProposalForm";
import ProposalDetails from "@/pages/admin/ProposalDetails";
import Users from "@/pages/admin/Users";

function RequireAuth({ children, adminOnly }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            richColors
            toastOptions={{ style: { fontFamily: "Ubuntu, sans-serif" } }}
          />
          <Routes>
            {/* Public */}
            <Route path="/" element={<ClientValidation />} />
            <Route path="/proposta" element={<ProposalView />} />

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminShell />
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="propostas" element={<Proposals />} />
              <Route path="propostas/nova" element={<ProposalForm />} />
              <Route path="propostas/:id" element={<ProposalDetails />} />
              <Route path="propostas/:id/editar" element={<ProposalForm />} />
              <Route path="empresas" element={<Companies />} />
              <Route
                path="empresas/nova"
                element={
                  <RequireAuth adminOnly>
                    <CompanyForm />
                  </RequireAuth>
                }
              />
              <Route
                path="empresas/:id/editar"
                element={
                  <RequireAuth adminOnly>
                    <CompanyForm />
                  </RequireAuth>
                }
              />
              <Route
                path="usuarios"
                element={
                  <RequireAuth adminOnly>
                    <Users />
                  </RequireAuth>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
