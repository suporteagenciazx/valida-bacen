# 05 — Autenticação & Roles

## JWT

- Algoritmo: `HS256`
- Validade: `JWT_EXPIRES_MINUTES` minutos (default `480` = 8h)
- Segredo: `JWT_SECRET_KEY` em `backend/.env`
- Payload:
  ```json
  {
    "sub": "email@x.com",
    "name": "Nome do usuário",
    "role": "admin" | "gerente",
    "uid": "uuid",
    "iat": 1779773000,
    "exp": 1779801800
  }
  ```

### Login
`POST /api/auth/login` → devolve `access_token` + objeto `user`.

### Refresh
Não há refresh-token. Quando o token expira, o frontend é redirecionado para
`/admin/login`.

## Hash de senha

`bcrypt.gensalt()` + `bcrypt.checkpw` (lib `bcrypt==4.1.3`). Os hashes ficam em
`users.password_hash`.

## Perfis

### `admin`
- CRUD irrestrito em **propostas**, **empresas** e **usuários**.
- Pode atribuir `gerente_id` em qualquer proposta.
- Pode criar admins e gerentes.

### `gerente`
- **Vê apenas as propostas em que `proposal.gerente_id == user.id`.**
- Pode criar propostas (vinculadas automaticamente a si).
- Pode editar/excluir apenas suas próprias propostas.
- Vê empresas (somente leitura).
- **Não** pode criar/editar/excluir empresas.
- **Não** pode acessar /admin/usuarios.

A restrição é aplicada no backend:

```python
def _scope_query(user, base=None):
    base = base or {}
    if user["role"] == "gerente":
        base["gerente_id"] = user["id"]
    return base
```

E também em cada endpoint `GET/{id}`, `PUT/{id}`, `DELETE/{id}` validando que
`proposal.gerente_id == user.id`.

## Frontend (gate)

`<RequireAuth>` em `App.js`:

```jsx
if (!user) return <Navigate to="/admin/login" />;
if (adminOnly && user.role !== "admin") return <Navigate to="/admin" />;
```

Combinado com **escondes / mostras** na sidebar e nas listas (ex. botões de
criar/excluir empresa só aparecem para admin).

## Resetar senha de um usuário

Atualmente via painel: `Admin` edita o usuário e preenche o campo **Nova senha**.
Não há fluxo de “esqueci minha senha” (não solicitado no escopo).

Para resetar manualmente via Mongo:

```js
db.users.updateOne(
  { email: "x@y.com" },
  { $set: { password_hash: "<novo_bcrypt_hash>" } }
)
```
