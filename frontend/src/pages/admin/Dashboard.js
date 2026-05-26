import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Building2,
  CheckCircle2,
  Clock3,
  XCircle,
  Banknote,
  ArrowUpRight,
} from "lucide-react";
import api, { formatBRL, formatDate } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";

const cards = [
  { key: "total_proposals", label: "Propostas", icon: FileText, accent: "text-[#025c75]" },
  { key: "total_companies", label: "Empresas", icon: Building2, accent: "text-[#025c75]" },
];

const statusCards = [
  { key: "APROVADA", label: "Aprovadas", icon: CheckCircle2, color: "text-green-600" },
  { key: "EM_ANALISE", label: "Em Análise", icon: Clock3, color: "text-yellow-600" },
  { key: "REPROVADA", label: "Reprovadas", icon: XCircle, color: "text-red-600" },
  { key: "LIBERADA", label: "Liberadas", icon: Banknote, color: "text-blue-600" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/dashboard")
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 skeleton rounded-md" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 skeleton rounded-lg" />
          ))}
        </div>
        <div className="h-64 skeleton rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-7" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#025c75] font-semibold">
            Visão Geral
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-[var(--color-text-dark)] mt-1">
            Olá, {user?.name?.split(" ")[0]}.
          </h1>
          <p className="text-sm text-gray-500 dark:text-[var(--color-text-muted-dark)] mt-1">
            {user?.role === "admin"
              ? "Você está visualizando todas as propostas do sistema."
              : "Você está visualizando apenas as propostas vinculadas ao seu usuário."}
          </p>
        </div>
        <Link to="/admin/propostas/nova" className="btn-primary" data-testid="dashboard-new-proposal-btn">
          <FileText className="w-4 h-4" /> Nova proposta
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.key} className="card flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-[var(--color-text-muted-dark)]">
                  {c.label}
                </div>
                <div className="text-3xl font-bold mt-2 text-gray-900 dark:text-[var(--color-text-dark)]" data-testid={`kpi-${c.key}`}>
                  {data?.[c.key] ?? 0}
                </div>
              </div>
              <div className={`p-2 rounded-md bg-[#025c75]/10 ${c.accent}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
        <div className="card flex items-start justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-[var(--color-text-muted-dark)]">
              Valor aprovado total
            </div>
            <div className="text-2xl font-bold mt-2 text-gray-900 dark:text-[var(--color-text-dark)]" data-testid="kpi-total-aprovado">
              {formatBRL(data?.total_valor_aprovado || 0)}
            </div>
          </div>
          <div className="p-2 rounded-md bg-green-50 dark:bg-green-900/20 text-green-600">
            <Banknote className="w-5 h-5" />
          </div>
        </div>
        <div className="card flex items-start justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-[var(--color-text-muted-dark)]">
              Pendentes de documentação
            </div>
            <div className="text-3xl font-bold mt-2 text-gray-900 dark:text-[var(--color-text-dark)]">
              {data?.by_status?.PENDENTE_DOCUMENTACAO ?? 0}
            </div>
          </div>
          <div className="p-2 rounded-md bg-orange-50 dark:bg-orange-900/20 text-orange-600">
            <Clock3 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-[var(--color-text-dark)]">
            Status das propostas
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statusCards.map((s) => {
            const Icon = s.icon;
            const count = data?.by_status?.[s.key] || 0;
            return (
              <div
                key={s.key}
                className="p-4 rounded-md border border-gray-200 dark:border-[var(--color-border-dark)]"
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-5 h-5 ${s.color}`} />
                  <span className="text-2xl font-bold text-gray-900 dark:text-[var(--color-text-dark)]">
                    {count}
                  </span>
                </div>
                <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-[var(--color-text-muted-dark)] mt-2">
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent proposals */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-[var(--color-text-dark)]">
            Propostas recentes
          </h2>
          <Link
            to="/admin/propostas"
            className="text-xs uppercase tracking-wider text-[#025c75] font-semibold flex items-center gap-1 hover:gap-2 transition-all"
          >
            Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {data?.recent_proposals?.length ? (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 dark:text-[var(--color-text-muted-dark)]">
                  <th className="px-2 py-2">Código</th>
                  <th className="px-2 py-2">Banco</th>
                  <th className="px-2 py-2">Valor</th>
                  <th className="px-2 py-2">Solicitação</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_proposals.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 dark:border-[var(--color-border-dark)]">
                    <td className="px-2 py-3 font-mono text-xs">
                      <Link to={`/admin/propostas/${p.id}`} className="text-[#025c75] hover:underline" data-testid={`recent-proposal-${p.codigo}`}>
                        {p.codigo}
                      </Link>
                    </td>
                    <td className="px-2 py-3 text-gray-700 dark:text-[var(--color-text-muted-dark)]">{p.banco}</td>
                    <td className="px-2 py-3 font-medium">{formatBRL(p.valor_aprovado || p.valor_solicitado)}</td>
                    <td className="px-2 py-3 text-gray-600 dark:text-[var(--color-text-muted-dark)]">{formatDate(p.data_solicitacao)}</td>
                    <td className="px-2 py-3"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500 dark:text-[var(--color-text-muted-dark)]">
            Nenhuma proposta cadastrada ainda.
          </div>
        )}
      </div>
    </div>
  );
}
