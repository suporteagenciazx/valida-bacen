# 04 — Modelos de Dados (MongoDB)

Banco: `valida_bacen`

## Coleções

### `users`

| Campo          | Tipo              | Observação                                  |
|----------------|-------------------|---------------------------------------------|
| `id`           | `string` (uuid4)  | PK aplicacional                             |
| `email`        | `string` (lower)  | índice único                                |
| `name`         | `string`          |                                             |
| `role`         | `"admin"` / `"gerente"` | controle de acesso                    |
| `password_hash`| `string`          | bcrypt                                      |
| `created_at`   | `datetime`        |                                             |
| `updated_at`   | `datetime`        |                                             |

### `companies`

| Campo                | Tipo            | Observação                            |
|----------------------|-----------------|---------------------------------------|
| `id`                 | `string` uuid4  | PK                                    |
| `cnpj`               | `string`        | índice único, formato `XX.XXX.XXX/XXXX-XX` |
| `razao_social`       | `string`        |                                       |
| `nome_fantasia`      | `string`        |                                       |
| `situacao_cadastral` | enum            | `ATIVA / INAPTA / SUSPENSA / BAIXADA` |
| `endereco`           | `string`        |                                       |
| `cidade`             | `string`        |                                       |
| `estado`             | `string` (UF)   |                                       |
| `telefone`           | `string`        |                                       |
| `email`              | `string`        |                                       |
| `responsavel_legal`  | `string`        |                                       |
| `data_abertura`      | `string` (YYYY-MM-DD) |                                  |
| `created_at`         | `datetime`      |                                       |
| `updated_at`         | `datetime`      |                                       |

### `proposals`

| Campo                | Tipo                | Observação                                            |
|----------------------|---------------------|-------------------------------------------------------|
| `id`                 | `string` uuid4      | PK                                                    |
| `codigo`             | `string`            | índice único, ex: `PROP-2026-0001`                    |
| `token`              | `string`            | índice único, ex: `VB-XXXX-XXXX-XXXX`                 |
| `company_id`         | `string` (FK)       | **índice único** (1 proposta por CNPJ)                |
| `gerente_id`         | `string` (FK) / null| Gerente vinculado (escopo de visibilidade)            |
| `banco`              | `string`            |                                                       |
| `codigo_bancario`    | `string`            | código compe                                           |
| `gerente_responsavel`| `string`            | nome textual do gerente do banco                       |
| `codigo_interno`     | `string`            |                                                       |
| `agencia`            | `string`            |                                                       |
| `conta`              | `string`            |                                                       |
| `valor_solicitado`   | `float`             | em BRL                                                |
| `valor_aprovado`     | `float`             |                                                       |
| `prazo_meses`        | `int`               |                                                       |
| `taxa_juros`         | `float` (% a.m.)    |                                                       |
| `cet`                | `float` (% a.a.)    |                                                       |
| `tipo_operacao`      | `string`            |                                                       |
| `modalidade_credito` | `string`            |                                                       |
| `garantias`          | `string`            |                                                       |
| `data_solicitacao`   | `string` (YYYY-MM-DD) |                                                     |
| `data_aprovacao`     | `string` / null     |                                                       |
| `validade_proposta`  | `string` (YYYY-MM-DD) |                                                     |
| `faturamento_anual`  | `float`             |                                                       |
| `segmento`           | `string`            |                                                       |
| `porte`              | enum                | `MEI / MICROEMPRESA / PEQUENA / MEDIA / GRANDE`       |
| `score_interno`      | `int` 0..1000       |                                                       |
| `status`             | enum                | `EM_ANALISE / APROVADA / REPROVADA / LIBERADA / PENDENTE_DOCUMENTACAO` |
| `observacoes`        | `string`            |                                                       |
| `history`            | `array<HistoryEntry>` | entradas manuais + automáticas (mudança de status)  |
| `created_at`         | `datetime`          |                                                       |
| `updated_at`         | `datetime`          |                                                       |

### `HistoryEntry` (embedded)

| Campo         | Tipo             |
|---------------|------------------|
| `timestamp`   | string ISO       |
| `status`      | string \| null   |
| `description` | string           |
| `author`      | string           |

## Índices

```python
await db.users.create_index("email", unique=True)
await db.companies.create_index("cnpj", unique=True)
await db.proposals.create_index("codigo", unique=True)
await db.proposals.create_index("token", unique=True)
await db.proposals.create_index("company_id", unique=True)  # 1 proposta por CNPJ
```

## Seed inicial

Executado uma única vez no `lifespan` da FastAPI:

- 1 admin (`admin@validabacen.com / Admin@123`)
- 1 gerente (`gerente@validabacen.com / Gerente@123`)
- 4 empresas + 4 propostas (2 vinculadas ao gerente, 2 sem dono)
