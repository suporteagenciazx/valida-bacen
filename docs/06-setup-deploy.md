# 06 — Setup local & Deploy

## Variáveis de ambiente

### `backend/.env`
| Chave                    | Default                        | Descrição                            |
|--------------------------|--------------------------------|--------------------------------------|
| `MONGO_URL`              | `mongodb://localhost:27017`    | obrigatório                          |
| `DB_NAME`                | `valida_bacen`                 | obrigatório                          |
| `CORS_ORIGINS`           | `*`                            | lista CSV                            |
| `JWT_SECRET_KEY`         | **trocar em prod**             | obrigatório                          |
| `JWT_ALGORITHM`          | `HS256`                        |                                      |
| `JWT_EXPIRES_MINUTES`    | `480`                          |                                      |
| `SEEDED_ADMIN_EMAIL`     | `admin@validabacen.com`        | usado só no primeiro start           |
| `SEEDED_ADMIN_PASSWORD`  | `Admin@123`                    | usado só no primeiro start           |
| `SEEDED_ADMIN_NAME`      | `Administrador Master`         |                                      |

### `frontend/.env`
| Chave                  | Valor                                       |
|------------------------|---------------------------------------------|
| `REACT_APP_BACKEND_URL`| URL externa do backend (com https, sem `/api`) |
| `WDS_SOCKET_PORT`      | 443 (dev hot reload)                         |

## Supervisor

Tanto o frontend (porta `3000`) quanto o backend (porta `8001`) rodam via
supervisor — **não inicie servidores manualmente**.

```bash
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
sudo supervisorctl status
```

Logs em `/var/log/supervisor/`:

```bash
tail -n 100 /var/log/supervisor/backend.err.log
tail -n 100 /var/log/supervisor/frontend.out.log
```

## Instalação de dependências

### Backend
```bash
cd /app/backend
pip install <pacote> && pip freeze > requirements.txt
sudo supervisorctl restart backend
```

### Frontend
```bash
cd /app/frontend
yarn add <pacote>
sudo supervisorctl restart frontend
```

## Testes rápidos

```bash
# Health
curl -s $REACT_APP_BACKEND_URL/api/

# Login admin
curl -s -X POST $REACT_APP_BACKEND_URL/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@validabacen.com","password":"Admin@123"}'

# Validar proposta (CNPJ + código + token)
curl -s -X POST $REACT_APP_BACKEND_URL/api/proposals/validate \
  -H 'Content-Type: application/json' \
  -d '{"cnpj":"12.345.678/0001-90","codigo":"PROP-2026-0001","token":"VB-A4F9-K2M7-X8P1"}'
```

## Deploy

A plataforma Emergent expõe o `/` para a porta `3000` (frontend) e `/api` para
`8001` (backend). Apenas garanta que:

- `REACT_APP_BACKEND_URL` no frontend aponte para o domínio público.
- `MONGO_URL` no backend aponte para o MongoDB do cluster.
- `JWT_SECRET_KEY` esteja trocado.

## Subir do zero (em outra máquina)

```bash
# Pré-requisitos: python 3.11+, node 18+, yarn, mongo 6+

# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env       # ajustar
uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend
cd frontend
yarn install
yarn start                 # CRACO em :3000
```
