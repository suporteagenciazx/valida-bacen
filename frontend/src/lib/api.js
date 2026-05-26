import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vb_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("vb_token");
      localStorage.removeItem("vb_user");
      if (window.location.pathname.startsWith("/admin") && window.location.pathname !== "/admin/login") {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export const formatCNPJ = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

export const formatBRL = (n) =>
  (n ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

export const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
      // assume YYYY-MM-DD
      const [y, m, day] = iso.split("-");
      if (y && m && day) return `${day}/${m}/${y}`;
      return iso;
    }
    return d.toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
};

export const formatDateTime = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export const STATUS_LABELS = {
  EM_ANALISE: "Em Análise",
  APROVADA: "Aprovada",
  REPROVADA: "Reprovada",
  LIBERADA: "Liberada",
  PENDENTE_DOCUMENTACAO: "Pendente Doc.",
};

export const PORTE_LABELS = {
  MEI: "MEI",
  MICROEMPRESA: "Microempresa",
  PEQUENA: "Pequena",
  MEDIA: "Média",
  GRANDE: "Grande",
};
