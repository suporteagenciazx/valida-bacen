import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ShieldCheck, Mail, KeyRound, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Bem-vindo(a)!");
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch bg-[#f1f1f1]" data-testid="admin-login-page">
      {/* Visual side */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#025c75] via-[#024558] to-[#012d3a] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
             style={{ backgroundImage: "radial-gradient(circle at 25% 25%, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative z-10 m-auto px-12 max-w-lg">
          <div className="w-12 h-12 rounded-md bg-white/10 flex items-center justify-center mb-8">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="text-[11px] uppercase tracking-[0.25em] opacity-70 mb-3">
            Painel Administrativo
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Gestão de propostas de crédito empresarial.
          </h1>
          <p className="mt-5 text-base text-white/70 leading-relaxed">
            Cadastre empresas, emita propostas, acompanhe o histórico e
            controle o acesso de gerentes em um único painel.
          </p>
          <ul className="mt-10 space-y-3 text-sm text-white/80">
            <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-white/60" /> CRUD completo de propostas e empresas</li>
            <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-white/60" /> Histórico manual de movimentações</li>
            <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-white/60" /> Controle por perfil Admin / Gerente</li>
          </ul>
        </div>
      </div>

      {/* Form side */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="max-w-md w-full mx-auto">
          <a href="/" className="text-xs uppercase tracking-wider text-gray-500 hover:text-gray-700 flex items-center gap-2 mb-10">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar à validação pública
          </a>

          <div className="text-[11px] uppercase tracking-[0.25em] text-[#025c75] font-semibold">
            Valida BACEN
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 mt-2">
            Acesso ao painel
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Entre com seu e-mail e senha de administrador ou gerente.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label-base flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> E-mail
              </label>
              <input
                data-testid="login-email-input"
                type="email"
                className="input-base"
                placeholder="admin@validabacen.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="label-base flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Senha
              </label>
              <input
                data-testid="login-password-input"
                type="password"
                className="input-base"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-btn"
              className="btn-primary w-full !py-3"
            >
              {loading ? <span className="spinner" /> : "Entrar no painel"}
            </button>
          </form>

          <div className="mt-8 p-4 rounded-md bg-gray-50 border border-gray-200 text-xs text-gray-600">
            <div className="font-semibold mb-1 text-gray-700">Credenciais de demonstração:</div>
            <div>Admin: <span className="font-mono">admin@validabacen.com / Admin@123</span></div>
            <div>Gerente: <span className="font-mono">gerente@validabacen.com / Gerente@123</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
