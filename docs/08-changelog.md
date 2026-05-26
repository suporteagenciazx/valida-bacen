# 08 — Changelog

## 2.1.0 — Jan / 2026 (UX & branding)
- Adicionado **favicon** oficial (`/favicon.ico`).
- Substituído o ícone `ShieldCheck` pela **logo oficial do Banco Central do
  Brasil** em todos os pontos de marca (home, painel admin, login, topbar mobile).
- **Botão "Imprimir"** reescrito com a lib `react-to-print`:
  - Cria iframe offscreen com o conteúdo da proposta + CSS herdado.
  - Funciona corretamente mesmo dentro do iframe de preview do Emergent.
  - `documentTitle` = `Proposta-<código>` para sugerir nome de arquivo no PDF.
- Removido botão **"Área Administrativa"** da home (acesso só por URL `/admin/login`).
- Removido botão flutuante **"Made with Emergent"** (HTML + CSS de segurança).
- Removido bloco **"Credenciais de demonstração"** da página de login.
- Adicionado documento de **deploy em Docker / VPS** (ver `09-deploy-docker-vps.md`).

## 2.0.0 — Jan / 2026
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
