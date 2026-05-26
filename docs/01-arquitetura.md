# 01 — Arquitetura

## Visão geral

```
┌─────────────────┐      HTTPS       ┌─────────────────┐
│  Cliente Web    │ ───────────────▶ │  Ingress K8s    │
│  (React SPA)    │                  │   /  → :3000    │
│                 │                  │   /api → :8001  │
└────────┬────────┘                  └────────┬────────┘
         │                                    │
         │                                    ▼
         │                          ┌─────────────────┐
         │                          │  FastAPI        │
         │                          │  Backend :8001  │
         │                          └────────┬────────┘
         │                                   │ Motor (async)
         │                                   ▼
         │                          ┌─────────────────┐
         └─────── (sem auth) ──────▶│  MongoDB        │
                                    │  valida_bacen   │
                                    └─────────────────┘
```

## Stack

| Camada    | Tecnologia                                         |
|-----------|----------------------------------------------------|
| Frontend  | React 19, React Router 7, Tailwind, Lucide, Sonner |
| Backend   | FastAPI, Pydantic v2, Motor (Mongo async), PyJWT, bcrypt |
| Banco     | MongoDB (índices únicos: email, cnpj, codigo, token, company_id) |
| Build     | CRACO + CRA, Yarn                                  |
| Processo  | Supervisor (`backend` / `frontend`)                |

## Fluxos críticos

### 1) Validação pública (cliente)

```
Usuário → POST /api/proposals/validate { cnpj, codigo, token }
         (frontend ainda aguarda 4,5s para apresentar o resultado)
Backend → Procura proposal por { codigo, token } e checa CNPJ na empresa
Retorno → { proposal, company } salvos em sessionStorage
Frontend→ /proposta renderiza no formato oficial
```

### 2) Login admin/gerente

```
POST /api/auth/login { email, password }
   → JWT { sub, name, role, uid } válido por JWT_EXPIRES_MINUTES (default 480)
Frontend grava em localStorage e injeta no header Authorization de todas as
requisições subsequentes via axios interceptor.
```

### 3) Visibilidade por role

- `admin`  → vê **tudo** (todas as propostas, empresas e usuários).
- `gerente`→ vê apenas propostas onde `proposal.gerente_id == user.id`.

A regra é aplicada **no backend** (não somente no frontend) através do helper
`_scope_query(user)` em `server.py`.

### 4) Vinculação automática

- Quando um **gerente** cria uma proposta, `gerente_id` é forçado para ele.
- Quando um **admin** cria/edita, ele pode escolher livremente.
- Cada CNPJ pode ter **apenas 1 proposta** (índice único em `company_id`).

## Diretórios

```
/app
├── backend/
│   ├── server.py        # FastAPI + rotas + seed
│   ├── requirements.txt
│   └── .env             # MONGO_URL, JWT_*, seed admin
├── frontend/
│   ├── src/
│   │   ├── App.js               # rotas
│   │   ├── index.css            # tokens visuais Ubuntu + paleta
│   │   ├── context/             # Auth + Theme
│   │   ├── lib/api.js           # axios + helpers
│   │   ├── pages/
│   │   │   ├── ClientValidation.js
│   │   │   ├── ProposalView.js
│   │   │   └── admin/
│   │   │       ├── Login.js
│   │   │       ├── AdminShell.js
│   │   │       ├── Dashboard.js
│   │   │       ├── Companies.js
│   │   │       ├── CompanyForm.js
│   │   │       ├── Proposals.js
│   │   │       ├── ProposalForm.js
│   │   │       ├── ProposalDetails.js
│   │   │       └── Users.js
│   │   └── components/StatusBadge.js
│   └── package.json
├── docs/                # esta documentação
└── memory/PRD.md
```

## Decisões de design

- **JWT customizado** (em vez de OAuth) por simplicidade e por exigência do projeto.
- **Histórico manual** é um array no documento `proposal` (em vez de coleção
  separada) — evita joins e é simples de auditar.
- **1 proposta por CNPJ** via índice único + validação no serviço.
- **Delay de 4,5 s** é aplicado **no frontend** (sensação de processamento
  oficial) — `await Promise.all([api.post(...), wait(4500)])`.
