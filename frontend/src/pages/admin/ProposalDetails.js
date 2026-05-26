import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Pencil, Trash2, Plus, Calendar, User2, FileText, X,
} from "lucide-react";
import { toast } from "sonner";
import api, { formatBRL, formatDate, formatDateTime, PORTE_LABELS, STATUS_LABELS } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

function Section({ title, children }) {
  return (
    <section className="border-t border-gray-200 dark:border-[var(--color-border-dark)] pt-5 mt-5 first:border-0 first:mt-0 first:pt-0">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#025c75] mb-4">
        {title}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">{children}</div>
    </section>
  );
}

function Item({ label, value, mono, span = 1 }) {
  return (
    <div className={span === 2 ? "sm:col-span-2" : span === 3 ? "sm:col-span-3" : ""}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-[var(--color-text-muted-dark)]">{label}</div>
      <div className={`mt-1 text-sm text-gray-900 dark:text-[var(--color-text-dark)] ${mono ? "font-mono" : "font-medium"}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}

export default function ProposalDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/admin/proposals/${id}`)
      .then(({ data }) => setData(data))
      .catch((err) => {
        toast.error(err.response?.data?.detail || "Proposta não encontrada");
        navigate("/admin/propostas");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const onDelete = async () => {
    if (!window.confirm(`Excluir proposta ${data.codigo}?`)) return;
    try {
      await api.delete(`/admin/proposals/${id}`);
      toast.success("Proposta excluída");
      navigate("/admin/propostas");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao excluir");
    }
  };

  const removeHistory = async (index) => {
    if (!window.confirm("Remover esta entrada do histórico?")) return;
    try {
      await api.delete(`/admin/proposals/${id}/history/${index}`);
      toast.success("Entrada removida");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao remover");
    }
  };

  if (loading) return <div className="h-64 skeleton rounded-lg" />;
  if (!data) return null;
  const p = data;
  const c = data.company;

  return (
    <div className="space-y-6" data-testid="proposal-details-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to="/admin/propostas" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-[var(--color-text-muted-dark)]">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="flex items-center gap-2">
          <Link to={`/admin/propostas/${id}/editar`} className="btn-secondary" data-testid="edit-proposal-btn">
            <Pencil className="w-4 h-4" /> Editar
          </Link>
          <button onClick={onDelete} className="btn-danger" data-testid="delete-proposal-btn">
            <Trash2 className="w-4 h-4" /> Excluir
          </button>
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#025c75] font-semibold">Proposta</div>
        <div className="flex items-end justify-between flex-wrap gap-3 mt-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-[var(--color-text-dark)] font-mono">
            {p.codigo}
          </h1>
          <StatusBadge status={p.status} />
        </div>
        <div className="text-sm text-gray-500 dark:text-[var(--color-text-muted-dark)] mt-1 font-mono">
          Token {p.token}
        </div>
      </div>

      <div className="card">
        <Section title="Empresa">
          <Item label="Razão Social" value={c?.razao_social} span={2} />
          <Item label="Nome Fantasia" value={c?.nome_fantasia} />
          <Item label="CNPJ" value={c?.cnpj} mono />
          <Item label="Situação" value={c?.situacao_cadastral} />
          <Item label="Cidade/UF" value={`${c?.cidade || ""} / ${c?.estado || ""}`} />
          <Item label="Responsável Legal" value={c?.responsavel_legal} span={3} />
        </Section>

        <Section title="Vinculação">
          <Item label="Gerente vinculado" value={data.gerente?.name || "— Nenhum —"} />
          <Item label="E-mail do gerente" value={data.gerente?.email} span={2} />
        </Section>

        <Section title="Instituição Financeira">
          <Item label="Banco" value={p.banco} span={2} />
          <Item label="Código Bancário" value={p.codigo_bancario} mono />
          <Item label="Agência" value={p.agencia} mono />
          <Item label="Conta" value={p.conta} mono />
          <Item label="Gerente responsável" value={p.gerente_responsavel} />
          <Item label="Código interno" value={p.codigo_interno} mono />
        </Section>

        <Section title="Condições Financeiras">
          <Item label="Valor solicitado" value={formatBRL(p.valor_solicitado)} />
          <Item label="Valor aprovado" value={formatBRL(p.valor_aprovado)} />
          <Item label="Prazo" value={`${p.prazo_meses} meses`} />
          <Item label="Taxa de juros" value={`${p.taxa_juros?.toFixed?.(2) ?? p.taxa_juros}% a.m.`} />
          <Item label="CET" value={`${p.cet?.toFixed?.(2) ?? p.cet}% a.a.`} />
          <Item label="Tipo de operação" value={p.tipo_operacao} />
          <Item label="Modalidade" value={p.modalidade_credito} span={2} />
          <Item label="Garantias" value={p.garantias} span={3} />
          <Item label="Data solicitação" value={formatDate(p.data_solicitacao)} />
          <Item label="Data aprovação" value={formatDate(p.data_aprovacao)} />
          <Item label="Validade" value={formatDate(p.validade_proposta)} />
        </Section>

        <Section title="Perfil do Negócio">
          <Item label="Segmento" value={p.segmento} span={2} />
          <Item label="Porte" value={PORTE_LABELS[p.porte]} />
          <Item label="Faturamento anual" value={formatBRL(p.faturamento_anual)} />
          <Item label="Score interno" value={p.score_interno} />
        </Section>

        {p.observacoes && (
          <Section title="Observações">
            <div className="col-span-full text-sm leading-relaxed text-gray-700 dark:text-[var(--color-text-muted-dark)] whitespace-pre-line">
              {p.observacoes}
            </div>
          </Section>
        )}
      </div>

      {/* History */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-[var(--color-text-dark)]">
            Histórico de movimentações
          </h3>
          <button
            onClick={() => setShowHistoryModal(true)}
            className="btn-primary"
            data-testid="add-history-btn"
          >
            <Plus className="w-4 h-4" /> Adicionar movimentação
          </button>
        </div>

        {Array.isArray(p.history) && p.history.length ? (
          <ul className="space-y-3">
            {p.history.map((h, idx) => (
              <li
                key={idx}
                className="relative pl-6 border-l-2 border-[#025c75]/30 pb-3"
              >
                <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-[#025c75] ring-4 ring-[#025c75]/10" />
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-[var(--color-text-muted-dark)] flex items-center gap-2 flex-wrap">
                      <Calendar className="w-3 h-3" /> {formatDateTime(h.timestamp)}
                      <User2 className="w-3 h-3 ml-2" /> {h.author}
                      {h.status && <StatusBadge status={h.status} />}
                    </div>
                    <div className="text-sm text-gray-800 dark:text-[var(--color-text-dark)] mt-1">
                      {h.description}
                    </div>
                  </div>
                  <button
                    onClick={() => removeHistory(idx)}
                    className="btn-ghost p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    data-testid={`delete-history-${idx}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-[var(--color-text-muted-dark)]">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Nenhuma movimentação registrada.
          </div>
        )}
      </div>

      {showHistoryModal && (
        <HistoryModal
          proposalId={id}
          onClose={() => setShowHistoryModal(false)}
          onSaved={() => { setShowHistoryModal(false); load(); }}
        />
      )}
    </div>
  );
}

function HistoryModal({ proposalId, onClose, onSaved }) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const defaultDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const defaultTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [author, setAuthor] = useState("");
  const [authorType, setAuthorType] = useState("Gerente");
  const [description, setDescription] = useState("");
  const [statusOpt, setStatusOpt] = useState("");
  const [saving, setSaving] = useState(false);

  const authors = ["Banco", "Comitê de Crédito", "Gerente", "Sistema", "Cliente", "Outro"];

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalAuthor = authorType === "Outro" ? author : (author ? `${authorType} — ${author}` : authorType);
      await api.post(`/admin/proposals/${proposalId}/history`, {
        timestamp: `${date}T${time}:00`,
        status: statusOpt || null,
        description,
        author: finalAuthor,
      });
      toast.success("Movimentação adicionada");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao adicionar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" data-testid="history-modal">
      <div className="surface w-full max-w-lg rounded-lg border border-gray-200 dark:border-[var(--color-border-dark)] shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[var(--color-border-dark)]">
          <h3 className="text-lg font-bold text-gray-900 dark:text-[var(--color-text-dark)]">Nova movimentação</h3>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Data</label>
              <input type="date" className="input-base" required value={date} onChange={(e) => setDate(e.target.value)} data-testid="history-date-input" />
            </div>
            <div>
              <label className="label-base">Hora</label>
              <input type="time" className="input-base" required value={time} onChange={(e) => setTime(e.target.value)} data-testid="history-time-input" />
            </div>
          </div>
          <div>
            <label className="label-base">Quem fez</label>
            <div className="grid grid-cols-2 gap-3">
              <select className="input-base" value={authorType} onChange={(e) => setAuthorType(e.target.value)} data-testid="history-author-type-select">
                {authors.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <input
                className="input-base"
                placeholder={authorType === "Outro" ? "Digite o autor" : "Nome (opcional)"}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                data-testid="history-author-input"
              />
            </div>
          </div>
          <div>
            <label className="label-base">Status associado (opcional)</label>
            <select className="input-base" value={statusOpt} onChange={(e) => setStatusOpt(e.target.value)}>
              <option value="">— Nenhum —</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base">Descrição</label>
            <textarea
              rows={4}
              required
              className="input-base resize-none"
              placeholder="Ex: Documentação validada pelo comitê de crédito..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="history-description-input"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-[var(--color-border-dark)]">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary" data-testid="history-submit-btn">
              {saving ? <span className="spinner" /> : <><Plus className="w-4 h-4" /> Adicionar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
