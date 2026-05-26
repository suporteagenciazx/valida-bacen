# 03 — Frontend

React 19 SPA com React Router 7, Tailwind 3 e ícones Lucide.

## Rotas

| Caminho                              | Página                  | Acesso             |
|--------------------------------------|-------------------------|--------------------|
| `/`                                  | ClientValidation        | Público             |
| `/proposta`                          | ProposalView (sessão)   | Público (após validar) |
| `/admin/login`                       | Login                   | Público             |
| `/admin`                             | Dashboard               | Admin + Gerente     |
| `/admin/propostas`                   | Proposals               | Admin + Gerente     |
| `/admin/propostas/nova`              | ProposalForm            | Admin + Gerente     |
| `/admin/propostas/:id`               | ProposalDetails         | Admin + Gerente (scope) |
| `/admin/propostas/:id/editar`        | ProposalForm            | Admin + Gerente (scope) |
| `/admin/empresas`                    | Companies               | Admin + Gerente (leitura) |
| `/admin/empresas/nova`               | CompanyForm             | Admin only          |
| `/admin/empresas/:id/editar`         | CompanyForm             | Admin only          |
| `/admin/usuarios`                    | Users                   | Admin only          |

`RequireAuth` (em `App.js`) faz o gate inicial, e o backend valida o resto.

## Contextos

- `AuthContext` (`/context/AuthContext.js`)
  - `user`, `login(email, password)`, `logout()`
  - Persiste em `localStorage.vb_token` / `localStorage.vb_user`
- `ThemeContext` (`/context/ThemeContext.js`)
  - `theme` (`light` | `dark`), `toggle()`
  - Aplica/remove classe `.dark` no `<html>`
  - Persiste em `localStorage.vb_theme`

## Estilos & tokens

- Fontes: `Ubuntu, "Segoe UI", "Helvetica Neue", Arial, sans-serif`.
- Cores via CSS variables em `src/index.css`:
  - `--color-primary: #025c75`
  - `--color-bg-light: #f1f1f1`
  - `--color-surface-light: #ffffff`
  - Variantes dark em `--color-*-dark`.
- Classes utilitárias customizadas:
  - `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`
  - `.input-base`, `.label-base`
  - `.card`, `.surface`
  - `.badge` + `.badge-aprovada` / `.badge-em_analise` / `.badge-reprovada` /
    `.badge-liberada` / `.badge-pendente_documentacao`
  - `.skeleton` (shimmer)
  - `.spinner`

## Comunicação com a API

`src/lib/api.js` exporta um axios pré-configurado:

- `baseURL = ${REACT_APP_BACKEND_URL}/api`
- Interceptor injeta `Authorization: Bearer <token>`.
- Interceptor 401 → limpa storage e manda para `/admin/login`.

Helpers úteis: `formatCNPJ`, `formatBRL`, `formatDate`, `formatDateTime`,
`STATUS_LABELS`, `PORTE_LABELS`.

## Histórico manual

- Em `ProposalDetails.js`, o botão **Adicionar movimentação** abre o modal
  `HistoryModal`.
- Campos: `Data`, `Hora`, `Quem fez` (autor por categoria), `Status` (opcional)
  e `Descrição`.
- Envia `POST /api/admin/proposals/{id}/history`.
- O backend simplesmente faz `push` no array `history`.

## Delay de 4,5 s (cliente)

Em `ClientValidation.js`:

```js
const wait = new Promise((r) => setTimeout(r, 4500));
await Promise.all([api.post("/proposals/validate", ...), wait]);
```

O delay roda em paralelo à chamada — se a API for mais rápida, espera; se for
mais lenta, prevalece o tempo da API.

## data-testid

Todos os elementos interativos e elementos-chave de UI possuem `data-testid` em
kebab-case (ex: `validate-submit-btn`, `cnpj-input`, `nav-propostas`).
