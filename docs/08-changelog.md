# 08 — Changelog

## 2.0.0 — Janeiro / 2026
- Migração do app React Native → **React + FastAPI web**.
- Backend reescrito como serviço único `server.py` com lifespan.
- Adicionado perfil **Gerente**: cada gerente só vê propostas onde
  `gerente_id == self.id`.
- Adicionado **CRUD de usuários** (`/api/admin/users`) — admin only.
- Adicionado endpoint **histórico manual**:
  - `POST /api/admin/proposals/{id}/history`
  - `DELETE /api/admin/proposals/{id}/history/{index}`
- Adicionado **delay de 4,5 s** na validação pública (cliente).
- Restrição **1 proposta por CNPJ** (índice único `company_id`).
- Painel admin com **dark / light mode** persistente.
- Tipografia padrão: `Ubuntu, "Segoe UI", "Helvetica Neue", Arial`.
- Documentação completa em `/app/docs/`.

## 1.x — Versões anteriores
- App em React Native + Expo, mesma API base.
