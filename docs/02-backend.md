# 02 — Backend (API)

Base URL: `${REACT_APP_BACKEND_URL}/api`

> Todos os endpoints autenticados exigem header
> `Authorization: Bearer <jwt>`. Caso o token expire (HTTP 401), o frontend
> redireciona para `/admin/login`.

## Convenções

- Todos os IDs são `uuid4` (strings) — nunca o `ObjectId` do Mongo.
- Datas são gravadas como `datetime` (UTC) e devolvidas como ISO string.
- O backend remove `_id` e `password_hash` antes de serializar.

## 1. Públicas (sem auth)

### `GET /api/`
Status do serviço. Resposta `200`:

```json
{ "service": "Valida BACEN API", "version": "2.0.0", "status": "online" }
```

### `POST /api/proposals/validate`
Validação cliente.

Request:
```json
{ "cnpj": "12.345.678/0001-90", "codigo": "PROP-2026-0001", "token": "VB-A4F9-K2M7-X8P1" }
```

Respostas:
- `200`: `{ proposal: {...}, company: {...} }`
- `404`: `Proposta não encontrada...`
- `403`: `CNPJ informado não corresponde...`

## 2. Autenticação

### `POST /api/auth/login`
Request: `{ email, password }`
Resposta:
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": { "id": "...", "email": "...", "name": "...", "role": "admin" }
}
```

### `GET /api/auth/me`
Retorna dados do usuário autenticado.

## 3. Dashboard

### `GET /api/admin/dashboard`
- `admin` → contagens globais.
- `gerente` → escopo apenas em suas propostas.

```json
{
  "total_proposals": 4,
  "total_companies": 4,
  "by_status": { "EM_ANALISE": 1, "APROVADA": 1, ... },
  "total_valor_aprovado": 1070000,
  "recent_proposals": [ ... ]
}
```

## 4. Usuários (admin-only)

| Método | Rota                                  | Descrição                      |
|--------|---------------------------------------|--------------------------------|
| GET    | `/api/admin/users`                    | Lista todos usuários           |
| GET    | `/api/admin/users/gerentes`           | Lista gerentes (admin+gerente) |
| POST   | `/api/admin/users`                    | Cria usuário                   |
| PUT    | `/api/admin/users/{id}`               | Atualiza (senha opcional)      |
| DELETE | `/api/admin/users/{id}`               | Remove (proibido se tem propostas vinculadas) |

Body create:
```json
{ "email": "x@y.com", "name": "Fulano", "password": "Senha@123", "role": "gerente" }
```

## 5. Empresas

| Método | Rota                                  | Auth   |
|--------|---------------------------------------|--------|
| GET    | `/api/admin/companies`                | user   |
| GET    | `/api/admin/companies/{id}`           | user   |
| POST   | `/api/admin/companies`                | admin  |
| PUT    | `/api/admin/companies/{id}`           | admin  |
| DELETE | `/api/admin/companies/{id}`           | admin  |

`CNPJ` é único. Não é possível excluir uma empresa com propostas vinculadas.

## 6. Propostas (escopo por role)

| Método | Rota                                                   | Auth                                       |
|--------|--------------------------------------------------------|--------------------------------------------|
| GET    | `/api/admin/proposals?status=&search=`                 | user (gerente filtra automaticamente)      |
| GET    | `/api/admin/proposals/{id}`                            | user (gerente: precisa estar vinculado)    |
| POST   | `/api/admin/proposals`                                 | user — gerente é forçado ao próprio id     |
| PUT    | `/api/admin/proposals/{id}`                            | user — gerente não pode reatribuir         |
| DELETE | `/api/admin/proposals/{id}`                            | user                                        |

Regras especiais:

- **1 proposta por CNPJ** (índice único em `company_id`).
- Alterar `status` adiciona automaticamente uma entrada em `history`.
- Campo `gerente_id` aceita `null` (proposta sem dono — só admin enxerga).

## 7. Histórico de movimentações (manual)

| Método | Rota                                                          | Auth                                  |
|--------|---------------------------------------------------------------|---------------------------------------|
| POST   | `/api/admin/proposals/{id}/history`                           | user                                  |
| DELETE | `/api/admin/proposals/{id}/history/{index}`                   | user                                  |

Body:
```json
{
  "timestamp": "2026-02-10T14:30:00",
  "status": "APROVADA",
  "description": "Aprovada pelo comitê de crédito",
  "author": "Comitê de Crédito"
}
```

> `timestamp` é uma string ISO **livre** (preenchida manualmente no painel).
> `status` é opcional. `author` pode ser qualquer texto: Banco, Comitê, Gerente,
> Sistema, Cliente, Outro etc.

## Códigos de status comuns

| Código | Significado                                |
|--------|--------------------------------------------|
| 200    | OK                                          |
| 201    | Criado                                     |
| 400    | Validação                                  |
| 401    | Não autenticado / token expirado            |
| 403    | Sem permissão para o recurso                |
| 404    | Recurso não encontrado                      |
| 409    | Conflito (CNPJ/código/token/duplicidade)    |
