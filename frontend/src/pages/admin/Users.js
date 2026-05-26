import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Users as UsersIcon, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function Users() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...user} = edit
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users");
      setItems(data);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (u) => {
    if (!window.confirm(`Excluir o usuário "${u.name}"?`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      toast.success("Usuário excluído");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao excluir");
    }
  };

  return (
    <div className="space-y-6" data-testid="users-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#025c75] font-semibold">Acessos</div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-[var(--color-text-dark)] mt-1">Gerentes & Admins</h1>
          <p className="text-sm text-gray-500 dark:text-[var(--color-text-muted-dark)] mt-1">
            Gerentes só veem propostas vinculadas a eles. Administradores veem tudo.
          </p>
        </div>
        <button onClick={() => setEditing({})} className="btn-primary" data-testid="new-user-btn">
          <Plus className="w-4 h-4" /> Novo usuário
        </button>
      </div>

      <div className="card !p-0">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 skeleton rounded-md" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-gray-500 dark:text-[var(--color-text-muted-dark)]">
            <UsersIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
            Nenhum usuário cadastrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[var(--color-surface-elev-dark)] text-[10px] uppercase tracking-wider text-gray-500 dark:text-[var(--color-text-muted-dark)]">
                <tr>
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3">E-mail</th>
                  <th className="text-left px-4 py-3">Perfil</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100 dark:border-[var(--color-border-dark)] hover:bg-gray-50 dark:hover:bg-[var(--color-surface-elev-dark)]">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-[var(--color-text-dark)]">{u.name}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-[var(--color-text-muted-dark)]">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.role === "admin" ? "badge-liberada" : "badge-aprovada"} flex items-center gap-1 w-fit`}>
                        {u.role === "admin" && <ShieldCheck className="w-3 h-3" />}
                        {u.role === "admin" ? "Administrador" : "Gerente"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(u)} className="btn-ghost p-2" data-testid={`edit-user-${u.id}`}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(u)} className="btn-ghost p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" data-testid={`delete-user-${u.id}`}>
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

      {editing !== null && (
        <UserModal user={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSaved }) {
  const isEdit = Boolean(user?.id);
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [role, setRole] = useState(user.role || "gerente");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        const payload = { name, email, role };
        if (password) payload.password = password;
        await api.put(`/admin/users/${user.id}`, payload);
        toast.success("Usuário atualizado");
      } else {
        await api.post("/admin/users", { name, email, role, password });
        toast.success("Usuário criado");
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" data-testid="user-modal">
      <div className="surface w-full max-w-md rounded-lg border border-gray-200 dark:border-[var(--color-border-dark)] shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[var(--color-border-dark)]">
          <h3 className="text-lg font-bold text-gray-900 dark:text-[var(--color-text-dark)]">
            {isEdit ? "Editar usuário" : "Novo usuário"}
          </h3>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="label-base">Nome</label>
            <input className="input-base" required value={name} onChange={(e) => setName(e.target.value)} data-testid="user-name-input" />
          </div>
          <div>
            <label className="label-base">E-mail</label>
            <input type="email" className="input-base" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="user-email-input" />
          </div>
          <div>
            <label className="label-base">Perfil</label>
            <select className="input-base" value={role} onChange={(e) => setRole(e.target.value)} data-testid="user-role-select">
              <option value="gerente">Gerente</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div>
            <label className="label-base">{isEdit ? "Nova senha (opcional)" : "Senha"}</label>
            <input
              type="password"
              className="input-base"
              required={!isEdit}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? "Deixe em branco para manter" : ""}
              data-testid="user-password-input"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-[var(--color-border-dark)]">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary" data-testid="user-save-btn">
              {saving ? <span className="spinner" /> : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
