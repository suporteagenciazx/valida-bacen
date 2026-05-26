import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { ArrowLeft, Calendar, ShieldCheck, Printer } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { formatBRL, formatDate, formatDateTime, PORTE_LABELS } from "@/lib/api";

function DataItem({ label, value, mono, span = 1 }) {
  return (
    <div className={`flex flex-col ${span === 2 ? "sm:col-span-2" : ""} ${span === 3 ? "sm:col-span-3" : ""}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        {label}
      </span>
      <span className={`mt-1 text-sm text-gray-900 ${mono ? "font-mono" : "font-medium"}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="border-t border-gray-200 pt-5 mt-5 first:border-0 first:mt-0 first:pt-0">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#025c75] mb-4">
        {title}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">{children}</div>
    </section>
  );
}

export default function ProposalView() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: data ? `Proposta-${data.proposal?.codigo || ""}` : "Proposta",
    pageStyle: `
      @page { size: A4; margin: 14mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; font-family: Ubuntu, 'Segoe UI', Arial, sans-serif; }
      }
    `,
  });

  useEffect(() => {
    const raw = sessionStorage.getItem("vb_validated") || localStorage.getItem("vb_validated");
    if (!raw) {
      navigate("/");
      return;
    }
    setData(JSON.parse(raw));
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") === "1") {
      setTimeout(() => handlePrint && handlePrint(), 700);
    }
    // eslint-disable-next-line
  }, [navigate]);

  if (!data) return null;
  const p = data.proposal;
  const c = data.company;

  return (
    <div className="min-h-screen bg-[#f1f1f1] print:bg-white" data-testid="proposal-view-page">
      {/* Header */}
      <header className="bg-[#025c75] text-white print:hidden">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => {
              sessionStorage.removeItem("vb_validated");
              localStorage.removeItem("vb_validated");
              navigate("/");
            }}
            className="flex items-center gap-2 text-sm opacity-90 hover:opacity-100"
            data-testid="back-home-btn"
          >
            <ArrowLeft className="w-4 h-4" /> Nova consulta
          </button>
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="w-5 h-5" />
            <span>Proposta autenticada</span>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 text-sm opacity-90 hover:opacity-100"
            data-testid="print-btn"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div ref={printRef} className="anim-fade-up">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#025c75]">
                Documento oficial
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mt-1">
                Proposta de Crédito Empresarial
              </h1>
              <div className="text-sm text-gray-500 mt-1">
                Emitida em {formatDate(p.data_solicitacao)}
              </div>
            </div>
            <StatusBadge status={p.status} testId="proposal-status-badge" />
          </div>

          <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6 sm:p-8">
            {/* Identification */}
            <div className="flex flex-wrap items-start justify-between border-b border-gray-200 pb-5 mb-5 gap-5">
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">
                  Código da proposta
                </div>
                <div className="text-lg font-bold tracking-tight font-mono text-gray-900" data-testid="proposal-codigo">
                  {p.codigo}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">
                  Token de validação
                </div>
                <div className="text-lg font-bold tracking-tight font-mono text-gray-900">
                  {p.token}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">
                  Validade da proposta
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatDate(p.validade_proposta)}
                </div>
              </div>
            </div>

            <Section title="Dados da Empresa">
              <DataItem label="Razão Social" value={c?.razao_social} span={2} />
              <DataItem label="Nome Fantasia" value={c?.nome_fantasia} />
              <DataItem label="CNPJ" value={c?.cnpj} mono />
              <DataItem label="Situação Cadastral" value={c?.situacao_cadastral} />
              <DataItem label="Data de Abertura" value={formatDate(c?.data_abertura)} />
              <DataItem label="Endereço" value={c?.endereco} span={3} />
              <DataItem label="Cidade / UF" value={`${c?.cidade || ""} / ${c?.estado || ""}`} />
              <DataItem label="Telefone" value={c?.telefone} />
              <DataItem label="E-mail" value={c?.email} />
              <DataItem label="Responsável Legal" value={c?.responsavel_legal} span={3} />
            </Section>

            <Section title="Instituição Financeira">
              <DataItem label="Banco" value={p.banco} span={2} />
              <DataItem label="Código Bancário" value={p.codigo_bancario} mono />
              <DataItem label="Agência" value={p.agencia} mono />
              <DataItem label="Conta" value={p.conta} mono />
              <DataItem label="Gerente Responsável" value={p.gerente_responsavel} />
              <DataItem label="Código Interno" value={p.codigo_interno} mono />
            </Section>

            <Section title="Condições Financeiras">
              <DataItem label="Valor Solicitado" value={formatBRL(p.valor_solicitado)} />
              <DataItem label="Valor Aprovado" value={formatBRL(p.valor_aprovado)} />
              <DataItem label="Prazo" value={`${p.prazo_meses} meses`} />
              <DataItem label="Taxa de Juros" value={`${p.taxa_juros.toFixed(2)}% a.m.`} />
              <DataItem label="CET" value={`${p.cet.toFixed(2)}% a.a.`} />
              <DataItem label="Tipo de Operação" value={p.tipo_operacao} />
              <DataItem label="Modalidade de Crédito" value={p.modalidade_credito} span={2} />
              <DataItem label="Garantias" value={p.garantias} span={3} />
              <DataItem label="Data Solicitação" value={formatDate(p.data_solicitacao)} />
              <DataItem label="Data Aprovação" value={formatDate(p.data_aprovacao)} />
              <DataItem label="Validade da Proposta" value={formatDate(p.validade_proposta)} />
            </Section>

            <Section title="Perfil do Negócio">
              <DataItem label="Segmento" value={p.segmento} span={2} />
              <DataItem label="Porte" value={PORTE_LABELS[p.porte]} />
              <DataItem label="Faturamento Anual" value={formatBRL(p.faturamento_anual)} />
              <DataItem label="Score Interno" value={p.score_interno} />
            </Section>

            {p.observacoes && (
              <Section title="Observações">
                <div className="col-span-full text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                  {p.observacoes}
                </div>
              </Section>
            )}

            {/* History */}
            {Array.isArray(p.history) && p.history.length > 0 && (
              <Section title="Histórico de movimentações">
                <div className="col-span-full">
                  <ul className="space-y-3">
                    {p.history.map((h, idx) => (
                      <li
                        key={idx}
                        className="flex gap-3 items-start border-l-2 border-[#025c75]/30 pl-4"
                      >
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                            <Calendar className="w-3 h-3" /> {formatDateTime(h.timestamp)}
                            {h.author && <span>• {h.author}</span>}
                            {h.status && <StatusBadge status={h.status} testId={`history-status-${idx}`} />}
                          </div>
                          <div className="text-sm text-gray-800 mt-1">{h.description}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </Section>
            )}
          </div>

          <div className="mt-6 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#025c75]" />
            Documento autenticado pelo sistema Valida BACEN em{" "}
            {new Date().toLocaleString("pt-BR")}.
          </div>
        </div>
      </main>
    </div>
  );
}
