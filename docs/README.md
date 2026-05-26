# Valida BACEN — Documentação Oficial

Sistema de **validação de propostas de crédito empresarial** com painel
administrativo (Admin / Gerente) construído em **React + FastAPI + MongoDB**.

> Esta pasta concentra toda a documentação do projeto. Sempre que adicionar uma
> nova feature ou alterar uma API, atualize o arquivo correspondente.

## Índice

| Seção | Descrição |
|-------|-----------|
| [01 — Arquitetura](./01-arquitetura.md) | Visão geral, stack, fluxos e diagrama |
| [02 — Backend (API)](./02-backend.md) | Endpoints, autenticação, modelos |
| [03 — Frontend](./03-frontend.md) | Estrutura de rotas, componentes e estilos |
| [04 — Modelos de Dados](./04-modelos-de-dados.md) | Schemas MongoDB (users, companies, proposals) |
| [05 — Autenticação & Roles](./05-autenticacao.md) | JWT, perfis Admin e Gerente, regras de acesso |
| [06 — Setup local & Deploy](./06-setup-deploy.md) | Variáveis de ambiente, supervisor, comandos |
| [07 — Migrações & Atualizações](./07-migracoes.md) | Como evoluir schemas, índices, seeds |
| [08 — Histórico de mudanças](./08-changelog.md) | Versões e alterações relevantes |

## Início rápido

```bash
# Backend (porta 8001 via supervisor)
sudo supervisorctl restart backend

# Frontend (porta 3000 via supervisor)
sudo supervisorctl restart frontend

# Mongo: já gerenciado pelo container
```

Após subir, acesse:

- **Cliente (público)** → `https://<host>/`
- **Painel admin**     → `https://<host>/admin/login`

### Credenciais padrão (semeadas)

| Perfil   | E-mail                          | Senha         |
|----------|---------------------------------|---------------|
| Admin    | `admin@validabacen.com`         | `Admin@123`   |
| Gerente  | `gerente@validabacen.com`       | `Gerente@123` |

> ⚠️ Troque essas credenciais antes de subir em produção alterando
> `SEEDED_ADMIN_PASSWORD` no `.env` e atualizando o usuário pelo painel.

## Identidade visual

- **Cores:** `#025c75` (primária), `#f1f1f1` (fundo), `#ffffff` (superfície)
- **Fonte:** `Ubuntu, "Segoe UI", "Helvetica Neue", Arial, sans-serif`
- **Dark mode:** apenas no painel admin (`/admin/*`)

## Funcionalidades principais

1. **Validação pública** com CNPJ + Código + Token (delay 4.5s).
2. **Painel admin** com login JWT (Admin / Gerente).
3. **CRUD** completo de Propostas, Empresas e Usuários.
4. **Histórico manual** de movimentações com data, hora, autor e descrição.
5. **Vinculação Gerente ↔ Proposta** — gerentes só veem o que é deles.
6. **Restrição 1 proposta por CNPJ.**
7. **Dark / Light mode** persistente.

---
Última atualização: **Janeiro / 2026**.
