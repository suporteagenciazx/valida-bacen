import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import api, { formatCNPJ } from "@/lib/api";

const empty = {
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  situacao_cadastral: "ATIVA",
  endereco: "",
  cidade: "",
  estado: "",
  telefone: "",
  email: "",
  responsavel_legal: "",
  data_abertura: "",
};

export default function CompanyForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    api.get(`/admin/companies/${id}`)
      .then(({ data }) => setForm({ ...empty, ...data }))
      .catch(() => toast.error("Empresa não encontrada"))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/admin/companies/${id}`, form);
        toast.success("Empresa atualizada");
      } else {
        await api.post("/admin/companies", form);
        toast.success("Empresa cadastrada");
      }
      navigate("/admin/empresas");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-64 skeleton rounded-lg" />;

  return (
    <div className="space-y-6" data-testid="company-form-page">
      <Link to="/admin/empresas" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-[var(--color-text-muted-dark)]">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#025c75] font-semibold">
          {isEdit ? "Editar" : "Cadastrar"}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-[var(--color-text-dark)] mt-1">
          {isEdit ? "Editar Empresa" : "Nova Empresa"}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="card space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="label-base">Razão Social</label>
            <input className="input-base" required value={form.razao_social} onChange={(e) => set("razao_social", e.target.value)} data-testid="razao-social-input" />
          </div>
          <div>
            <label className="label-base">Nome Fantasia</label>
            <input className="input-base" required value={form.nome_fantasia} onChange={(e) => set("nome_fantasia", e.target.value)} />
          </div>
          <div>
            <label className="label-base">CNPJ</label>
            <input className="input-base" required maxLength={18} value={form.cnpj} onChange={(e) => set("cnpj", formatCNPJ(e.target.value))} data-testid="cnpj-input" />
          </div>
          <div>
            <label className="label-base">Situação Cadastral</label>
            <select className="input-base" value={form.situacao_cadastral} onChange={(e) => set("situacao_cadastral", e.target.value)}>
              <option value="ATIVA">ATIVA</option>
              <option value="INAPTA">INAPTA</option>
              <option value="SUSPENSA">SUSPENSA</option>
              <option value="BAIXADA">BAIXADA</option>
            </select>
          </div>
          <div>
            <label className="label-base">Data de Abertura</label>
            <input type="date" className="input-base" required value={form.data_abertura} onChange={(e) => set("data_abertura", e.target.value)} />
          </div>

          <div className="lg:col-span-3">
            <label className="label-base">Endereço</label>
            <input className="input-base" required value={form.endereco} onChange={(e) => set("endereco", e.target.value)} />
          </div>
          <div>
            <label className="label-base">Cidade</label>
            <input className="input-base" required value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
          </div>
          <div>
            <label className="label-base">Estado (UF)</label>
            <input className="input-base uppercase" required maxLength={2} value={form.estado} onChange={(e) => set("estado", e.target.value.toUpperCase())} />
          </div>
          <div>
            <label className="label-base">Telefone</label>
            <input className="input-base" required value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
          </div>
          <div>
            <label className="label-base">E-mail</label>
            <input type="email" className="input-base" required value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="lg:col-span-2">
            <label className="label-base">Responsável Legal</label>
            <input className="input-base" required value={form.responsavel_legal} onChange={(e) => set("responsavel_legal", e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-[var(--color-border-dark)]">
          <Link to="/admin/empresas" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={saving} className="btn-primary" data-testid="company-save-btn">
            {saving ? <span className="spinner" /> : <><Save className="w-4 h-4" /> Salvar</>}
          </button>
        </div>
      </form>
    </div>
  );
}
