# PRD — Valida BACEN

## Problema original (verbatim)
Recriar o app "Valida BACEN" como aplicação web **React + FastAPI** (não mobile)
a partir do repositório `https://github.com/suporteagenciazx/valida-bacen.git`.
Sistema de validação de propostas de crédito empresarial, com:

- Cliente valida com CNPJ + Código + Token (sem login).
- Painel admin com login JWT (e-mail/senha).
- CRUD de propostas e empresas.
- Cores `#f1f1f1`, `#025c75`, `#fff`.
- Dark/light mode no painel admin.
- MongoDB para persistência.
- Adicionar usuários Gerentes (só veem/editam/excluem propostas vinculadas
  a eles); Admin vê tudo. Gerente que cria proposta se vincula
  automaticamente; admin pode vincular qualquer gerente. Cada CNPJ = 1 proposta.
- Fonte padrão: `Ubuntu, "Segoe UI", "Helvetica Neue", Arial, sans-serif`.
- Pasta `/docs` com toda documentação em markdown.
- Histórico manual de movimentações na tela da proposta (data, hora, descrição,
  autor — preenchidos manualmente).
- Delay de 4,5 s após o cliente submeter a validação.

## Tech stack
- Frontend: React 19, React Router 7, Tailwind, Lucide, Sonner toasts
- Backend: FastAPI, Motor (Mongo async), PyJWT, bcrypt
- Banco: MongoDB (`valida_bacen`)
- Processo: Supervisor

## Personas
1. **Cliente final (público)** — visita a home, valida proposta com 3 dados,
   recebe documento oficial.
2. **Administrador** — gerencia todas as propostas, empresas e usuários.
3. **Gerente** — gerencia somente as propostas vinculadas a ele.

## O que foi implementado (Jan/2026)
- ✅ Backend FastAPI completo (`/api/proposals/validate`, `/api/auth/*`,
  `/api/admin/dashboard`, `/api/admin/proposals`, `/api/admin/companies`,
  `/api/admin/users`, `/api/admin/proposals/{id}/history`).
- ✅ JWT auth + roles `admin` / `gerente` + escopo automático no backend.
- ✅ Restrição 1 proposta por CNPJ (índice único + 409).
- ✅ Histórico manual (POST/DELETE) com timestamp, status (opcional), autor e
  descrição.
- ✅ Frontend completo:
  - Página pública de validação com **delay de 4,5 s** e estado de loading.
  - Página de visualização da proposta (formato oficial).
  - Painel admin com sidebar / mobile bottom nav, dark/light persistente.
  - Dashboard com KPIs e propostas recentes.
  - CRUD de Empresas, Propostas e Usuários.
  - Modal de adição/remoção de histórico.
- ✅ Tipografia Ubuntu, paleta `#025c75 / #f1f1f1 / #fff`.
- ✅ Seed: 1 admin + 1 gerente + 4 empresas + 4 propostas.
- ✅ Documentação completa em `/app/docs/` (8 arquivos markdown).
- ✅ Testes: 25/25 backend ✓ , 100% frontend ✓ (test_reports/iteration_1.json + 2).

## Backlog (P1/P2)
- **P1** Exportar PDF da proposta na visualização do cliente.
- **P1** Filtro de propostas por intervalo de datas e por gerente.
- **P1** Upload de anexos (contrato assinado, comprovantes).
- **P2** Coleção separada para histórico se ultrapassar 200 entradas por proposta.
- **P2** Auditoria de ações (quem editou o quê e quando).
- **P2** Fluxo de "esqueci minha senha" (e-mail SMTP).
- **P2** Splittar `server.py` em routers/services (>1000 linhas hoje).
- **P2** Notificações push/e-mail quando status muda (SendGrid / Twilio).

## Credenciais
Ver `/app/memory/test_credentials.md`.

## Documentação
Ver `/app/docs/README.md` (sumário) e os 8 arquivos numerados.
