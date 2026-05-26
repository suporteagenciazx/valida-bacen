import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, FileText, Search, Eye } from "lucide-react";
import { toast } from "sonner";
import api, { formatBRL, formatDate, STATUS_LABELS } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

export default function Proposals() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const { data } = await api.get("/admin/proposals", { params });
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  const onDelete = async (p) => {
    if (!window.confirm(`Excluir a proposta "${p.codigo}"?`)) return;
    try {
      await api.delete(`/admin/proposals/${p.id}`);
      toast.success("Proposta excluída");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao excluir");
    }
  };

  return (
    <div className="space-y-6" data-testid="proposals-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#025c75] font-semibold">Operações</div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-[var(--color-text-dark)] mt-1">Propostas</h1>
          <p className="text-sm text-gray-500 dark:text-[var(--color-text-muted-dark)] mt-1">
            Gestão de propostas de crédito empresarial.
          </p>
        </div>
        <Link to="/admin/propostas/nova" className="btn-primary" data-testid="new-proposal-btn">
          <Plus className="w-4 h-4" /> Nova proposta
        </Link>
      </div>

      <div className="card !p-0">
        <div className="p-4 border-b border-gray-200 dark:border-[var(--color-border-dark)] grid sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              data-testid="proposal-search-input"
              className="input-base pl-10"
              placeholder="Buscar por código, token ou banco"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") load(); }}
            />
          </div>
          <select
            className="input-base"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data-testid="proposal-status-filter"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 skeleton rounded-md" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-gray-500 dark:text-[var(--color-text-muted-dark)]">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            Nenhuma proposta encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[var(--color-surface-elev-dark)] text-[10px] uppercase tracking-wider text-gray-500 dark:text-[var(--color-text-muted-dark)]">
                <tr>
                  <th className="text-left px-4 py-3">Código</th>
                  <th className="text-left px-4 py-3">Empresa</th>
                  <th className="text-left px-4 py-3">Banco</th>
                  <th className="text-left px-4 py-3">Valor Aprovado</th>
                  <th className="text-left px-4 py-3">Solicitação</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 dark:border-[var(--color-border-dark)] hover:bg-gray-50 dark:hover:bg-[var(--color-surface-elev-dark)]">
                    <td className="px-4 py-3">
                      <Link to={`/admin/propostas/${p.id}`} className="font-mono text-xs text-[#025c75] hover:underline">
                        {p.codigo}
                      </Link>
                      <div className="text-[10px] text-gray-400 font-mono">{p.token}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900 dark:text-[var(--color-text-dark)]">{p.company?.razao_social || "—"}</div>
                      <div className="text-xs text-gray-500 dark:text-[var(--color-text-muted-dark)]">{p.company?.cnpj}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-[var(--color-text-muted-dark)]">{p.banco}</td>
                    <td className="px-4 py-3 font-medium">{formatBRL(p.valor_aprovado || p.valor_solicitado)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-[var(--color-text-muted-dark)]">{formatDate(p.data_solicitacao)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/propostas/${p.id}`}
                          className="btn-ghost p-2"
                          data-testid={`view-proposal-${p.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/admin/propostas/${p.id}/editar`}
                          className="btn-ghost p-2"
                          data-testid={`edit-proposal-${p.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => onDelete(p)}
                          className="btn-ghost p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          data-testid={`delete-proposal-${p.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
