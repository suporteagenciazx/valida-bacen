import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Building2, Search } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Companies() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/companies");
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onDelete = async (c) => {
    if (!window.confirm(`Excluir a empresa "${c.razao_social}"?`)) return;
    try {
      await api.delete(`/admin/companies/${c.id}`);
      toast.success("Empresa excluída");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao excluir");
    }
  };

  const filtered = items.filter((c) => {
    const q = search.toLowerCase();
    return !q ||
      c.razao_social.toLowerCase().includes(q) ||
      c.nome_fantasia.toLowerCase().includes(q) ||
      c.cnpj.includes(q);
  });

  return (
    <div className="space-y-6" data-testid="companies-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#025c75] font-semibold">Cadastro</div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-[var(--color-text-dark)] mt-1">Empresas</h1>
          <p className="text-sm text-gray-500 dark:text-[var(--color-text-muted-dark)] mt-1">
            Empresas que recebem propostas de crédito.
          </p>
        </div>
        {user?.role === "admin" && (
          <Link to="/admin/empresas/nova" className="btn-primary" data-testid="new-company-btn">
            <Plus className="w-4 h-4" /> Nova empresa
          </Link>
        )}
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-[var(--color-border-dark)]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              data-testid="company-search-input"
              className="input-base pl-10"
              placeholder="Buscar por razão social, nome fantasia ou CNPJ"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 skeleton rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500 dark:text-[var(--color-text-muted-dark)]">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            Nenhuma empresa encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[var(--color-surface-elev-dark)] text-[10px] uppercase tracking-wider text-gray-500 dark:text-[var(--color-text-muted-dark)]">
                <tr>
                  <th className="text-left px-4 py-3">Razão Social</th>
                  <th className="text-left px-4 py-3">CNPJ</th>
                  <th className="text-left px-4 py-3">Cidade / UF</th>
                  <th className="text-left px-4 py-3">Situação</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100 dark:border-[var(--color-border-dark)] hover:bg-gray-50 dark:hover:bg-[var(--color-surface-elev-dark)]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-[var(--color-text-dark)]">{c.razao_social}</div>
                      <div className="text-xs text-gray-500 dark:text-[var(--color-text-muted-dark)]">{c.nome_fantasia}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{c.cnpj}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-[var(--color-text-muted-dark)]">{c.cidade} / {c.estado}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${c.situacao_cadastral === "ATIVA" ? "badge-aprovada" : "badge-em_analise"}`}>
                        {c.situacao_cadastral}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {user?.role === "admin" && (
                          <>
                            <Link
                              to={`/admin/empresas/${c.id}/editar`}
                              className="btn-ghost p-2"
                              data-testid={`edit-company-${c.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => onDelete(c)}
                              className="btn-ghost p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              data-testid={`delete-company-${c.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
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
