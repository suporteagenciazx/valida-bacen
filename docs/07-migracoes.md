# 07 — Migrações & Atualizações

Como o MongoDB é schemaless, “migração” aqui significa **scripts auxiliares**
para alterar dados existentes quando o schema lógico evolui.

## Padrão recomendado

1. Faça o ajuste no `Pydantic` (server.py) — backward compatible se possível.
2. Crie um script ad-hoc em `/app/scripts/migrations/aaaa-mm-dd-<descricao>.py`.
3. Documente aqui o que foi feito.

Esqueleto:

```python
# /app/scripts/migrations/2026-02-15-add-tags-to-proposals.py
import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parents[2] / "backend/.env")

async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    res = await db.proposals.update_many(
        {"tags": {"$exists": False}},
        {"$set": {"tags": []}},
    )
    print(f"Atualizadas {res.modified_count} propostas")

asyncio.run(main())
```

Rode com `python /app/scripts/migrations/2026-02-15-add-tags-to-proposals.py`.

## Adicionar índices

```python
from pymongo import ASCENDING
await db.proposals.create_index([("status", ASCENDING)])
```

Os índices core já existem (ver doc 04).

## Renomear campos

```python
db.proposals.update_many({}, {"$rename": {"valor_total": "valor_aprovado"}})
```

## Migrações típicas previstas

- Adicionar `tags` em propostas.
- Adicionar `attachments` (uploads).
- Histórico em coleção separada (se ultrapassar X entradas por proposta).
- Soft-delete (`deleted_at`).

## Versão do app

A versão é exposta em `GET /api/` → `version: "2.0.0"`.
Aumente manualmente em `server.py` ao adicionar feature relevante.
