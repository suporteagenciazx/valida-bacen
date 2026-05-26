import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const empty = {
  codigo: "",
  token: "",
  company_id: "",
  gerente_id: "",
  banco: "",
  codigo_bancario: "",
  gerente_responsavel: "",
  codigo_interno: "",
  agencia: "",
  conta: "",
  valor_solicitado: 0,
  valor_aprovado: 0,
  prazo_meses: 12,
  taxa_juros: 1.5,
  cet: 18,
  tipo_operacao: "",
  modalidade_credito: "",
  garantias: "",
  data_solicitacao: new Date().toISOString().slice(0, 10),
  data_aprovacao: "",
  validade_proposta: "",
  faturamento_anual: 0,
  segmento: "",
  porte: "PEQUENA",
  score_interno: 500,
  status: "EM_ANALISE",
  observacoes: "",
};

const portes = ["MEI", "MICROEMPRESA", "PEQUENA", "MEDIA", "GRANDE"];
const statuses = ["EM_ANALISE", "APROVADA", "REPROVADA", "LIBERADA", "PENDENTE_DOCUMENTACAO"];

function generateCodigo() {
  const y = new Date().getFullYear();
  const n = String(Math.floor(Math.random() * 9999)).padStart(4, "0");
  return `PROP-${y}-${n}`;
}
function generateToken() {
  const seg = () =>
    Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "X");
  return `VB-${seg()}-${seg()}-${seg()}`;
}

export default function ProposalForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();

  const [form, setForm] = useState(empty);
  const [companies, setCompanies] = useState([]);
  const [gerentes, setGerentes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const tasks = [
      api.get("/admin/companies").then(({ data }) => setCompanies(data)),
      api.get("/admin/users/gerentes").then(({ data }) => setGerentes(data)).catch(() => {}),
    ];
    if (isEdit) {
      setLoading(true);
      tasks.push(
        api.get(`/admin/proposals/${id}`).then(({ data }) => {
          const { company, gerente, history, created_at, updated_at, ...rest } = data;
          setForm({ ...empty, ...rest, gerente_id: rest.gerente_id || "" });
        })
      );
    } else {
      setForm((f) => ({
        ...f,
        codigo: generateCodigo(),
        token: generateToken(),
        gerente_id: user?.role === "gerente" ? user.id : "",
      }));
    }
    Promise.all(tasks).finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      // numeric coercion
      ["valor_solicitado", "valor_aprovado", "taxa_juros", "cet", "faturamento_anual"].forEach((k) => {
        payload[k] = Number(payload[k]) || 0;
      });
      ["prazo_meses", "score_interno"].forEach((k) => {
        payload[k] = parseInt(payload[k]) || 0;
      });
      if (!payload.gerente_id) payload.gerente_id = null;
      if (!payload.data_aprovacao) payload.data_aprovacao = null;

      if (isEdit) {
        await api.put(`/admin/proposals/${id}`, payload);
        toast.success("Proposta atualizada");
      } else {
        await api.post("/admin/proposals", payload);
        toast.success("Proposta criada");
      }
      navigate("/admin/propostas");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-64 skeleton rounded-lg" />;

  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6" data-testid="proposal-form-page">
      <Link to="/admin/propostas" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-[var(--color-text-muted-dark)]">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#025c75] font-semibold">
          {isEdit ? "Editar" : "Cadastrar"}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-[var(--color-text-dark)] mt-1">
          {isEdit ? "Editar Proposta" : "Nova Proposta"}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Identification */}
        <div className="card">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#025c75] mb-4">Identificação</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label-base">Código da proposta</label>
              <div className="flex gap-2">
                <input className="input-base font-mono" required value={form.codigo} onChange={(e) => set("codigo", e.target.value.toUpperCase())} data-testid="codigo-input" />
                {!isEdit && (
                  <button type="button" onClick={() => set("codigo", generateCodigo())} className="btn-ghost px-3" title="Gerar">
                    <Wand2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="label-base">Token de validação</label>
              <div className="flex gap-2">
                <input className="input-base font-mono" required value={form.token} onChange={(e) => set("token", e.target.value.toUpperCase())} data-testid="token-input" />
                {!isEdit && (
                  <button type="button" onClick={() => set("token", generateToken())} className="btn-ghost px-3">
                    <Wand2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="label-base">Status</label>
              <select className="input-base" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="label-base">Empresa (CNPJ)</label>
              <select className="input-base" required value={form.company_id} onChange={(e) => set("company_id", e.target.value)} data-testid="company-select">
                <option value="">— Selecione uma empresa —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.razao_social} — {c.cnpj}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-base">Gerente vinculado</label>
              {isAdmin ? (
                <select className="input-base" value={form.gerente_id || ""} onChange={(e) => set("gerente_id", e.target.value)} data-testid="gerente-select">
                  <option value="">— Nenhum —</option>
                  {gerentes.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} — {g.email}</option>
                  ))}
                </select>
              ) : (
                <input className="input-base" disabled value={user?.name} />
              )}
            </div>
          </div>
        </div>

        {/* Bank */}
        <div className="card">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#025c75] mb-4">Instituição financeira</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="label-base">Banco</label>
              <input className="input-base" required value={form.banco} onChange={(e) => set("banco", e.target.value)} />
            </div>
            <div>
              <label className="label-base">Código bancário</label>
              <input className="input-base font-mono" required value={form.codigo_bancario} onChange={(e) => set("codigo_bancario", e.target.value)} />
            </div>
            <div>
              <label className="label-base">Agência</label>
              <input className="input-base font-mono" required value={form.agencia} onChange={(e) => set("agencia", e.target.value)} />
            </div>
            <div>
              <label className="label-base">Conta</label>
              <input className="input-base font-mono" required value={form.conta} onChange={(e) => set("conta", e.target.value)} />
            </div>
            <div>
              <label className="label-base">Código interno</label>
              <input className="input-base font-mono" required value={form.codigo_interno} onChange={(e) => set("codigo_interno", e.target.value)} />
            </div>
            <div className="lg:col-span-2">
              <label className="label-base">Gerente responsável (texto)</label>
              <input className="input-base" required value={form.gerente_responsavel} onChange={(e) => set("gerente_responsavel", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Financial */}
        <div className="card">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#025c75] mb-4">Condições financeiras</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label-base">Valor solicitado (R$)</label>
              <input type="number" step="0.01" className="input-base" required value={form.valor_solicitado} onChange={(e) => set("valor_solicitado", e.target.value)} />
            </div>
            <div>
              <label className="label-base">Valor aprovado (R$)</label>
              <input type="number" step="0.01" className="input-base" required value={form.valor_aprovado} onChange={(e) => set("valor_aprovado", e.target.value)} />
            </div>
            <div>
              <label className="label-base">Prazo (meses)</label>
              <input type="number" className="input-base" required value={form.prazo_meses} onChange={(e) => set("prazo_meses", e.target.value)} />
            </div>
            <div>
              <label className="label-base">Taxa de juros (% a.m.)</label>
              <input type="number" step="0.01" className="input-base" required value={form.taxa_juros} onChange={(e) => set("taxa_juros", e.target.value)} />
            </div>
            <div>
              <label className="label-base">CET (% a.a.)</label>
              <input type="number" step="0.01" className="input-base" required value={form.cet} onChange={(e) => set("cet", e.target.value)} />
            </div>
            <div>
              <label className="label-base">Tipo de operação</label>
              <input className="input-base" required value={form.tipo_operacao} onChange={(e) => set("tipo_operacao", e.target.value)} />
            </div>
            <div className="lg:col-span-2">
              <label className="label-base">Modalidade de crédito</label>
              <input className="input-base" required value={form.modalidade_credito} onChange={(e) => set("modalidade_credito", e.target.value)} />
            </div>
            <div>
              <label className="label-base">Validade da proposta</label>
              <input type="date" className="input-base" required value={form.validade_proposta} onChange={(e) => set("validade_proposta", e.target.value)} />
            </div>
            <div>
              <label className="label-base">Data solicitação</label>
              <input type="date" className="input-base" required value={form.data_solicitacao} onChange={(e) => set("data_solicitacao", e.target.value)} />
            </div>
            <div>
              <label className="label-base">Data aprovação</label>
              <input type="date" className="input-base" value={form.data_aprovacao || ""} onChange={(e) => set("data_aprovacao", e.target.value)} />
            </div>
            <div className="lg:col-span-3">
              <label className="label-base">Garantias</label>
              <input className="input-base" required value={form.garantias} onChange={(e) => set("garantias", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Business */}
        <div className="card">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#025c75] mb-4">Perfil do negócio</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="label-base">Segmento</label>
              <input className="input-base" required value={form.segmento} onChange={(e) => set("segmento", e.target.value)} />
            </div>
            <div>
              <label className="label-base">Porte</label>
              <select className="input-base" value={form.porte} onChange={(e) => set("porte", e.target.value)}>
                {portes.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label-base">Faturamento anual (R$)</label>
              <input type="number" step="0.01" className="input-base" required value={form.faturamento_anual} onChange={(e) => set("faturamento_anual", e.target.value)} />
            </div>
            <div>
              <label className="label-base">Score interno (0-1000)</label>
              <input type="number" min="0" max="1000" className="input-base" required value={form.score_interno} onChange={(e) => set("score_interno", e.target.value)} />
            </div>
          </div>
          <div className="mt-4">
            <label className="label-base">Observações</label>
            <textarea rows={4} className="input-base resize-none" value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link to="/admin/propostas" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={saving} className="btn-primary" data-testid="proposal-save-btn">
            {saving ? <span className="spinner" /> : <><Save className="w-4 h-4" /> Salvar proposta</>}
          </button>
        </div>
      </form>
    </div>
  );
}
