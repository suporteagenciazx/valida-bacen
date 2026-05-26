# 09 — Deploy em Docker (VPS privada)

Este guia mostra como **subir o Valida BACEN inteiro em uma VPS própria**
(DigitalOcean, Hetzner, Contabo, AWS Lightsail, etc.) usando **Docker** e
**Docker Compose** — frontend (Nginx), backend (FastAPI / Uvicorn) e MongoDB.

> Tudo o que está aqui é **independente da plataforma Emergent**. Você só
> precisa de Docker e domínio (opcional). HTTPS via **Caddy** (automático) ou
> **Traefik** / **Nginx + Certbot**.

---

## Visão geral

```
                ┌──── Internet ────┐
                │                  │
            :80/:443                
                │
        ┌───────▼────────┐     (Caddy faz HTTPS automático)
        │     CADDY       │
        │  reverse-proxy  │
        └───┬───────┬─────┘
            │       │
            │       │
   /api → :8001    / → :3000
            │       │
   ┌────────▼─┐ ┌───▼────────┐
   │ backend  │ │  frontend  │
   │ FastAPI  │ │   Nginx    │
   └────┬─────┘ └────────────┘
        │
   ┌────▼─────┐
   │ mongo:7  │
   │  vol     │
   └──────────┘
```

---

## Pré-requisitos na VPS

```bash
# Ubuntu/Debian
sudo apt update && sudo apt -y install ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) \
   signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
   https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update && sudo apt -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER && newgrp docker
```

Aponte seu domínio (`A` record) para o IP da VPS:
- `validabacen.exemplo.com.br` → IP da VPS.

---

## Estrutura recomendada no servidor

```
/srv/valida-bacen/
├── backend/                # cópia do código (clonar repo aqui)
├── frontend/               # cópia do código
├── docker/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   ├── nginx.conf
│   └── Caddyfile
├── .env                    # variáveis sensíveis
└── docker-compose.yml
```

Clonar o projeto:

```bash
sudo mkdir -p /srv/valida-bacen && sudo chown -R $USER /srv/valida-bacen
cd /srv/valida-bacen
git clone https://github.com/suporteagenciazx/valida-bacen.git .
```

---

## 1. Arquivo `.env` (na raiz)

> **Troque obrigatoriamente** o `JWT_SECRET_KEY` e o
> `SEEDED_ADMIN_PASSWORD` antes do deploy.

```env
# Mongo
MONGO_ROOT_USER=vbroot
MONGO_ROOT_PASS=ChangeMe_StrongPassword_2026!
MONGO_DB=valida_bacen

# Backend
JWT_SECRET_KEY=troque_para_uma_string_aleatoria_64_chars
JWT_ALGORITHM=HS256
JWT_EXPIRES_MINUTES=480
SEEDED_ADMIN_EMAIL=admin@validabacen.com
SEEDED_ADMIN_PASSWORD=Admin@123_TROQUE
SEEDED_ADMIN_NAME=Administrador Master

# Público
DOMAIN=validabacen.exemplo.com.br
```

---

## 2. `docker/backend.Dockerfile`

```dockerfile
FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

---

## 3. `docker/frontend.Dockerfile` (build + Nginx)

```dockerfile
# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY frontend/ ./
# Variável injetada no build
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN yarn build

# ---- runtime ----
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 4. `docker/nginx.conf` (front)

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  # SPA fallback
  location / {
    try_files $uri /index.html;
  }

  # cache estático
  location ~* \.(?:css|js|jpg|jpeg|png|gif|ico|svg|woff2?)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
  }
}
```

---

## 5. `docker/Caddyfile` (HTTPS automático)

```caddy
{$DOMAIN} {
    encode zstd gzip

    # API -> backend
    handle /api/* {
        reverse_proxy backend:8001
    }

    # Tudo o resto -> frontend (Nginx)
    handle {
        reverse_proxy frontend:80
    }
}
```

> O Caddy gera o certificado Let's Encrypt automaticamente na primeira request.

---

## 6. `docker-compose.yml`

```yaml
services:
  mongo:
    image: mongo:7
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASS}
    volumes:
      - mongo_data:/data/db
    networks: [appnet]

  backend:
    build:
      context: .
      dockerfile: docker/backend.Dockerfile
    restart: unless-stopped
    depends_on: [mongo]
    environment:
      MONGO_URL: "mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASS}@mongo:27017/?authSource=admin"
      DB_NAME: ${MONGO_DB}
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
      JWT_ALGORITHM: ${JWT_ALGORITHM}
      JWT_EXPIRES_MINUTES: ${JWT_EXPIRES_MINUTES}
      SEEDED_ADMIN_EMAIL: ${SEEDED_ADMIN_EMAIL}
      SEEDED_ADMIN_PASSWORD: ${SEEDED_ADMIN_PASSWORD}
      SEEDED_ADMIN_NAME: ${SEEDED_ADMIN_NAME}
      CORS_ORIGINS: "*"
    networks: [appnet]

  frontend:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile
      args:
        REACT_APP_BACKEND_URL: "https://${DOMAIN}"
    restart: unless-stopped
    depends_on: [backend]
    networks: [appnet]

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      DOMAIN: ${DOMAIN}
    volumes:
      - ./docker/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [backend, frontend]
    networks: [appnet]

volumes:
  mongo_data:
  caddy_data:
  caddy_config:

networks:
  appnet:
    driver: bridge
```

---

## 7. Subir tudo

```bash
cd /srv/valida-bacen
docker compose build
docker compose up -d
docker compose ps
docker compose logs -f backend
```

Aguarde a primeira vez o Caddy emitir os certificados (~30 s). Acesse:

- `https://validabacen.exemplo.com.br/`           — cliente
- `https://validabacen.exemplo.com.br/admin/login` — painel

Login inicial: `admin@validabacen.com` / valor de `SEEDED_ADMIN_PASSWORD`.

---

## 8. Atualizar o app (deploy de novas versões)

```bash
cd /srv/valida-bacen
git pull
docker compose build
docker compose up -d
docker image prune -f
```

> **O Mongo é persistido** no volume `mongo_data` — os dados sobrevivem aos
> rebuilds.

---

## 9. Backup do MongoDB

### Cópia em arquivo (manual)

```bash
docker compose exec mongo mongodump \
  -u $MONGO_ROOT_USER -p $MONGO_ROOT_PASS --authenticationDatabase admin \
  --db $MONGO_DB --out /data/db/backup-$(date +%F)
docker cp $(docker compose ps -q mongo):/data/db/backup-$(date +%F) ./backups/
```

### Restore

```bash
docker compose exec mongo mongorestore \
  -u $MONGO_ROOT_USER -p $MONGO_ROOT_PASS --authenticationDatabase admin \
  /data/db/backup-2026-02-01
```

### Backup automático com cron

`/etc/cron.daily/valida-bacen-backup`:

```bash
#!/bin/bash
cd /srv/valida-bacen
DAY=$(date +%F)
docker compose exec -T mongo mongodump \
  -u $(grep MONGO_ROOT_USER .env|cut -d= -f2) \
  -p $(grep MONGO_ROOT_PASS .env|cut -d= -f2) \
  --authenticationDatabase admin --db valida_bacen \
  --archive --gzip > /var/backups/vb-$DAY.gz
find /var/backups -name "vb-*.gz" -mtime +14 -delete
```

```bash
sudo chmod +x /etc/cron.daily/valida-bacen-backup
```

---

## 10. Hardening básico (recomendado)

- Firewall (UFW):
  ```bash
  sudo ufw allow 22,80,443/tcp && sudo ufw enable
  ```
- Trocar todas as senhas padrão (`SEEDED_ADMIN_PASSWORD`, `MONGO_ROOT_PASS`).
- Usar SSH com chave (desabilitar password) e Fail2ban.
- Habilitar updates automáticos: `sudo apt -y install unattended-upgrades`.
- Logs centralizados (opcional): `logrotate` + `loki/grafana`.

---

## 11. Alternativa com Traefik (em vez de Caddy)

Se já usar Traefik no servidor, adicione labels:

```yaml
  backend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.vb-api.rule=Host(`${DOMAIN}`) && PathPrefix(`/api`)"
      - "traefik.http.routers.vb-api.tls=true"
      - "traefik.http.routers.vb-api.tls.certresolver=letsencrypt"
      - "traefik.http.services.vb-api.loadbalancer.server.port=8001"

  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.vb-web.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.vb-web.tls=true"
      - "traefik.http.routers.vb-web.tls.certresolver=letsencrypt"
      - "traefik.http.services.vb-web.loadbalancer.server.port=80"
```

E remova o serviço `caddy` do compose.

---

## 12. Resolução de problemas comuns

| Sintoma                                              | Causa provável                                                 | Como resolver                                                      |
|------------------------------------------------------|----------------------------------------------------------------|--------------------------------------------------------------------|
| `502 Bad Gateway`                                    | Backend ainda subindo                                          | `docker compose logs -f backend`                                   |
| Login retorna 500                                    | `MONGO_URL` inválido / Mongo sem auth                          | Verifique `.env` e o volume `mongo_data`                          |
| Frontend chama `localhost:8001` em produção          | `REACT_APP_BACKEND_URL` ausente no `docker build`              | Rebuild com `--build-arg REACT_APP_BACKEND_URL=https://<domínio>` |
| Certificado HTTPS não emite                          | Domínio não aponta para o IP, ou portas 80/443 não estão livres | Verifique DNS e firewall                                          |
| Admin inicial não existe                             | Migrou de outro Mongo e seed não rodou                         | Drop a coleção `users` e reinicie o backend                       |
| Print do cliente abre vazio                          | `react-to-print` precisa do `contentRef` no DOM                | Confira que `printRef` está no `<div>` da proposta (já está)      |

---

## 13. Subir em um único Dockerfile (modo "simples")

Se quiser servir tudo em **um único container** (sem Caddy), é possível usar
um Nginx como proxy interno também. Mas o setup com Caddy + serviços
separados é mais robusto, mais fácil de logar e de escalar.

---

✅ Pronto: com esses arquivos sua aplicação está rodando em produção em
**~5 minutos** após o `docker compose up -d`.
