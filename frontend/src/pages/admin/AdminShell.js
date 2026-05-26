import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Building2,
  Users,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true, roles: ["admin", "gerente"] },
  { to: "/admin/propostas", label: "Propostas", icon: FileText, roles: ["admin", "gerente"] },
  { to: "/admin/empresas", label: "Empresas", icon: Building2, roles: ["admin", "gerente"] },
  { to: "/admin/usuarios", label: "Gerentes", icon: Users, roles: ["admin"] },
];

export default function AdminShell() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const items = nav.filter((n) => n.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex bg-[#f1f1f1] dark:bg-[var(--color-bg-dark)]" data-testid="admin-shell">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col surface border-r border-gray-200 dark:border-[var(--color-border-dark)] sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-gray-200 dark:border-[var(--color-border-dark)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-white dark:bg-white flex items-center justify-center p-1 border border-gray-200 dark:border-[var(--color-border-dark)]">
            <img src="/bacen-logo.png" alt="BACEN" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-[var(--color-text-muted-dark)]">
              Painel
            </div>
            <div className="font-bold tracking-tight text-gray-900 dark:text-[var(--color-text-dark)]">Valida BACEN</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                data-testid={`nav-${it.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition ${
                    isActive
                      ? "bg-[#025c75] text-white"
                      : "text-gray-600 hover:bg-gray-100 dark:text-[var(--color-text-muted-dark)] dark:hover:bg-[var(--color-surface-elev-dark)]"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{it.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-[var(--color-border-dark)]">
          <div className="px-3 py-3 rounded-md bg-gray-50 dark:bg-[var(--color-surface-elev-dark)] mb-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-[var(--color-text-muted-dark)]">
              {user?.role === "admin" ? "Administrador" : "Gerente"}
            </div>
            <div className="text-sm font-semibold text-gray-900 dark:text-[var(--color-text-dark)] truncate">
              {user?.name}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-[var(--color-text-muted-dark)] truncate">
              {user?.email}
            </div>
          </div>
          <button
            onClick={toggle}
            data-testid="theme-toggle-btn"
            className="w-full btn-ghost justify-start text-sm"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
          </button>
          <button
            onClick={onLogout}
            data-testid="logout-btn"
            className="w-full btn-ghost justify-start text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 surface border-b border-gray-200 dark:border-[var(--color-border-dark)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-white border border-gray-200 dark:border-[var(--color-border-dark)] flex items-center justify-center p-0.5">
            <img src="/bacen-logo.png" alt="BACEN" className="w-full h-full object-contain" />
          </div>
          <div className="font-bold text-gray-900 dark:text-[var(--color-text-dark)]">Valida BACEN</div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggle} className="btn-ghost p-2">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={onLogout} className="btn-ghost p-2 text-red-600">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 surface border-t border-gray-200 dark:border-[var(--color-border-dark)] flex">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2 text-[10px] uppercase tracking-wider ${
                  isActive ? "text-[#025c75]" : "text-gray-500 dark:text-[var(--color-text-muted-dark)]"
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{it.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Main */}
      <main className="flex-1 min-h-screen md:pt-0 pt-16 pb-20 md:pb-0 px-4 sm:px-6 lg:px-10 py-6 overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
