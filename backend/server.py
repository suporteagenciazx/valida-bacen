"""
Valida BACEN - Backend API
FastAPI + MongoDB + JWT
Roles: admin (full access) | gerente (only proposals where gerente_id == self.id)
"""
import os
import uuid
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional, Literal

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jwt import InvalidTokenError
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from pymongo import ASCENDING

# ----------------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRES_MINUTES = int(os.environ.get("JWT_EXPIRES_MINUTES", "480"))
SEEDED_ADMIN_EMAIL = os.environ.get("SEEDED_ADMIN_EMAIL", "admin@validabacen.com")
SEEDED_ADMIN_PASSWORD = os.environ.get("SEEDED_ADMIN_PASSWORD", "Admin@123")
SEEDED_ADMIN_NAME = os.environ.get("SEEDED_ADMIN_NAME", "Administrador Master")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("valida-bacen")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

bearer_scheme = HTTPBearer(auto_error=True)


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def create_access_token(subject: str, name: str, role: str, user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "name": name,
        "role": role,
        "uid": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=JWT_EXPIRES_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    try:
        payload = decode_access_token(credentials.credentials)
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    email = payload.get("sub")
    user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user


async def get_current_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito ao Administrador")
    return user


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def serialize_doc(doc):
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        if k == "_id":
            continue
        if k == "password_hash":
            continue
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


# ----------------------------------------------------------------------------
# Pydantic Models
# ----------------------------------------------------------------------------
class Login(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# --- User (admin/gerente) ---
UserRole = Literal["admin", "gerente"]


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: UserRole = "gerente"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None


# --- Company ---
class CompanyBase(BaseModel):
    razao_social: str
    nome_fantasia: str
    cnpj: str  # XX.XXX.XXX/XXXX-XX
    situacao_cadastral: Literal["ATIVA", "INAPTA", "SUSPENSA", "BAIXADA"] = "ATIVA"
    endereco: str
    cidade: str
    estado: str
    telefone: str
    email: EmailStr
    responsavel_legal: str
    data_abertura: str  # YYYY-MM-DD


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None
    cnpj: Optional[str] = None
    situacao_cadastral: Optional[Literal["ATIVA", "INAPTA", "SUSPENSA", "BAIXADA"]] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None
    responsavel_legal: Optional[str] = None
    data_abertura: Optional[str] = None


# --- Proposal ---
ProposalStatus = Literal[
    "EM_ANALISE", "APROVADA", "REPROVADA", "LIBERADA", "PENDENTE_DOCUMENTACAO"
]


class HistoryEntry(BaseModel):
    timestamp: str  # ISO datetime string entered manually OR auto
    status: Optional[str] = None
    description: str
    author: str  # Banco, Comitê, Gerente, Sistema, etc.


class ProposalBase(BaseModel):
    codigo: str
    token: str
    company_id: str
    gerente_id: Optional[str] = None  # vinculação ao gerente
    banco: str
    codigo_bancario: str
    gerente_responsavel: str
    codigo_interno: str
    agencia: str
    conta: str
    valor_solicitado: float
    valor_aprovado: float
    prazo_meses: int
    taxa_juros: float
    cet: float
    tipo_operacao: str
    modalidade_credito: str
    garantias: str
    data_solicitacao: str
    data_aprovacao: Optional[str] = None
    validade_proposta: str
    faturamento_anual: float
    segmento: str
    porte: Literal["MEI", "MICROEMPRESA", "PEQUENA", "MEDIA", "GRANDE"]
    score_interno: int
    status: ProposalStatus = "EM_ANALISE"
    observacoes: str = ""


class ProposalCreate(ProposalBase):
    pass


class ProposalUpdate(BaseModel):
    codigo: Optional[str] = None
    token: Optional[str] = None
    company_id: Optional[str] = None
    gerente_id: Optional[str] = None
    banco: Optional[str] = None
    codigo_bancario: Optional[str] = None
    gerente_responsavel: Optional[str] = None
    codigo_interno: Optional[str] = None
    agencia: Optional[str] = None
    conta: Optional[str] = None
    valor_solicitado: Optional[float] = None
    valor_aprovado: Optional[float] = None
    prazo_meses: Optional[int] = None
    taxa_juros: Optional[float] = None
    cet: Optional[float] = None
    tipo_operacao: Optional[str] = None
    modalidade_credito: Optional[str] = None
    garantias: Optional[str] = None
    data_solicitacao: Optional[str] = None
    data_aprovacao: Optional[str] = None
    validade_proposta: Optional[str] = None
    faturamento_anual: Optional[float] = None
    segmento: Optional[str] = None
    porte: Optional[Literal["MEI", "MICROEMPRESA", "PEQUENA", "MEDIA", "GRANDE"]] = None
    score_interno: Optional[int] = None
    status: Optional[ProposalStatus] = None
    observacoes: Optional[str] = None


class ValidateProposalRequest(BaseModel):
    cnpj: str
    codigo: str
    token: str


class HistoryEntryCreate(BaseModel):
    timestamp: str  # ISO string ex: 2026-02-10T14:30:00
    status: Optional[str] = None
    description: str
    author: str


# ----------------------------------------------------------------------------
# App with lifespan
# ----------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.users.create_index([("email", ASCENDING)], unique=True)
    await db.companies.create_index([("cnpj", ASCENDING)], unique=True)
    await db.proposals.create_index([("codigo", ASCENDING)], unique=True)
    await db.proposals.create_index([("token", ASCENDING)], unique=True)
    await db.proposals.create_index([("company_id", ASCENDING)], unique=True)

    # Seed admin
    existing = await db.users.find_one({"email": SEEDED_ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "email": SEEDED_ADMIN_EMAIL,
                "name": SEEDED_ADMIN_NAME,
                "role": "admin",
                "password_hash": hash_password(SEEDED_ADMIN_PASSWORD),
                "created_at": now_utc(),
                "updated_at": now_utc(),
            }
        )
        logger.info("Seeded default admin: %s", SEEDED_ADMIN_EMAIL)

    if await db.companies.count_documents({}) == 0:
        await _seed_sample_data()
        logger.info("Seeded sample data")

    yield
    client.close()


app = FastAPI(title="Valida BACEN API", version="2.0.0", lifespan=lifespan)
api_router = APIRouter(prefix="/api")


# ----------------------------------------------------------------------------
# Seed sample data
# ----------------------------------------------------------------------------
async def _seed_sample_data():
    # Seed a sample gerente
    gerente_id = str(uuid.uuid4())
    await db.users.insert_one(
        {
            "id": gerente_id,
            "email": "gerente@validabacen.com",
            "name": "Ana Carolina Vieira",
            "role": "gerente",
            "password_hash": hash_password("Gerente@123"),
            "created_at": now_utc(),
            "updated_at": now_utc(),
        }
    )

    companies_seed = [
        {
            "razao_social": "Construtora Horizonte Azul Ltda",
            "nome_fantasia": "Horizonte Construções",
            "cnpj": "12.345.678/0001-90",
            "situacao_cadastral": "ATIVA",
            "endereco": "Av. Paulista, 1500, Sala 1201",
            "cidade": "São Paulo",
            "estado": "SP",
            "telefone": "(11) 3456-7890",
            "email": "contato@horizonteconstrucoes.com.br",
            "responsavel_legal": "Carlos Eduardo Almeida",
            "data_abertura": "2008-03-15",
        },
        {
            "razao_social": "Indústria Metalúrgica Ferrari S.A.",
            "nome_fantasia": "Ferrari Metals",
            "cnpj": "23.456.789/0001-01",
            "situacao_cadastral": "ATIVA",
            "endereco": "Rod. Anhanguera, Km 110, Galpão 8",
            "cidade": "Campinas",
            "estado": "SP",
            "telefone": "(19) 3211-4567",
            "email": "comercial@ferrarimetals.com.br",
            "responsavel_legal": "Roberto Ferrari Junior",
            "data_abertura": "1995-09-22",
        },
        {
            "razao_social": "Tech Solutions Brasil Ltda",
            "nome_fantasia": "TechSol",
            "cnpj": "34.567.890/0001-12",
            "situacao_cadastral": "ATIVA",
            "endereco": "Rua das Palmeiras, 230, Sala 502",
            "cidade": "Belo Horizonte",
            "estado": "MG",
            "telefone": "(31) 2522-9988",
            "email": "financeiro@techsol.com.br",
            "responsavel_legal": "Mariana Souza Pereira",
            "data_abertura": "2017-06-10",
        },
        {
            "razao_social": "Agropecuária Vale Verde Ltda",
            "nome_fantasia": "Fazenda Vale Verde",
            "cnpj": "45.678.901/0001-23",
            "situacao_cadastral": "ATIVA",
            "endereco": "Estrada Rural BR-153, Km 47",
            "cidade": "Goiânia",
            "estado": "GO",
            "telefone": "(62) 3098-7654",
            "email": "admin@valeverde.agr.br",
            "responsavel_legal": "José Augusto Mendes",
            "data_abertura": "2002-11-30",
        },
    ]

    company_ids = []
    now = now_utc()
    for c in companies_seed:
        cid = str(uuid.uuid4())
        company_ids.append(cid)
        await db.companies.insert_one({**c, "id": cid, "created_at": now, "updated_at": now})

    proposals_seed = [
        {
            "codigo": "PROP-2026-0001",
            "token": "VB-A4F9-K2M7-X8P1",
            "company_id": company_ids[0],
            "gerente_id": gerente_id,
            "banco": "Banco Santander Brasil",
            "codigo_bancario": "033",
            "gerente_responsavel": "Ana Carolina Vieira",
            "codigo_interno": "INT-78421",
            "agencia": "3415",
            "conta": "00123456-7",
            "valor_solicitado": 850000.00,
            "valor_aprovado": 750000.00,
            "prazo_meses": 36,
            "taxa_juros": 1.49,
            "cet": 19.84,
            "tipo_operacao": "Capital de Giro Garantido",
            "modalidade_credito": "Empréstimo Empresarial",
            "garantias": "Aval dos sócios + Recebíveis (15% do faturamento)",
            "data_solicitacao": "2026-01-10",
            "data_aprovacao": "2026-01-22",
            "validade_proposta": "2026-03-22",
            "faturamento_anual": 12500000.00,
            "segmento": "Construção Civil",
            "porte": "MEDIA",
            "score_interno": 782,
            "status": "APROVADA",
            "observacoes": "Cliente com excelente histórico. Liberação condicionada à assinatura digital do contrato.",
        },
        {
            "codigo": "PROP-2026-0002",
            "token": "VB-B5G1-L3N8-Y9Q2",
            "company_id": company_ids[1],
            "gerente_id": None,
            "banco": "Banco do Brasil",
            "codigo_bancario": "001",
            "gerente_responsavel": "Marcelo Antunes",
            "codigo_interno": "INT-78533",
            "agencia": "1234",
            "conta": "00987654-3",
            "valor_solicitado": 2500000.00,
            "valor_aprovado": 0.00,
            "prazo_meses": 60,
            "taxa_juros": 1.32,
            "cet": 17.65,
            "tipo_operacao": "FINAME - Aquisição de Maquinário",
            "modalidade_credito": "Financiamento BNDES",
            "garantias": "Alienação fiduciária do bem financiado",
            "data_solicitacao": "2026-01-18",
            "data_aprovacao": None,
            "validade_proposta": "2026-04-18",
            "faturamento_anual": 48000000.00,
            "segmento": "Indústria Metalúrgica",
            "porte": "GRANDE",
            "score_interno": 845,
            "status": "EM_ANALISE",
            "observacoes": "Proposta em análise pelo comitê de crédito.",
        },
        {
            "codigo": "PROP-2026-0003",
            "token": "VB-C6H2-M4P9-Z0R3",
            "company_id": company_ids[2],
            "gerente_id": gerente_id,
            "banco": "Itaú Unibanco",
            "codigo_bancario": "341",
            "gerente_responsavel": "Juliana Reis Tavares",
            "codigo_interno": "INT-78612",
            "agencia": "5678",
            "conta": "00456789-1",
            "valor_solicitado": 320000.00,
            "valor_aprovado": 320000.00,
            "prazo_meses": 24,
            "taxa_juros": 1.85,
            "cet": 24.52,
            "tipo_operacao": "Capital de Giro",
            "modalidade_credito": "Empréstimo Pré-aprovado",
            "garantias": "Aval dos sócios",
            "data_solicitacao": "2025-12-05",
            "data_aprovacao": "2025-12-15",
            "validade_proposta": "2026-02-15",
            "faturamento_anual": 3800000.00,
            "segmento": "Tecnologia da Informação",
            "porte": "PEQUENA",
            "score_interno": 695,
            "status": "LIBERADA",
            "observacoes": "Recursos liberados em conta corrente.",
        },
        {
            "codigo": "PROP-2026-0004",
            "token": "VB-D7J3-N5Q0-A1S4",
            "company_id": company_ids[3],
            "gerente_id": None,
            "banco": "Banco Bradesco",
            "codigo_bancario": "237",
            "gerente_responsavel": "Ricardo Oliveira",
            "codigo_interno": "INT-78720",
            "agencia": "0987",
            "conta": "00112233-4",
            "valor_solicitado": 1200000.00,
            "valor_aprovado": 0.00,
            "prazo_meses": 120,
            "taxa_juros": 0.92,
            "cet": 11.42,
            "tipo_operacao": "Pronaf - Plano Safra",
            "modalidade_credito": "Crédito Rural",
            "garantias": "Hipoteca de imóvel rural + Penhor da safra",
            "data_solicitacao": "2026-01-25",
            "data_aprovacao": None,
            "validade_proposta": "2026-03-25",
            "faturamento_anual": 8500000.00,
            "segmento": "Agronegócio",
            "porte": "MEDIA",
            "score_interno": 728,
            "status": "PENDENTE_DOCUMENTACAO",
            "observacoes": "Aguardando envio dos documentos rurais.",
        },
    ]

    history_seed = {
        "PROP-2026-0001": [
            {"timestamp": "2026-01-10T09:00:00", "status": "EM_ANALISE", "description": "Proposta cadastrada", "author": "Sistema"},
            {"timestamp": "2026-01-15T14:30:00", "status": "EM_ANALISE", "description": "Documentação validada pelo analista", "author": "Ana Carolina Vieira"},
            {"timestamp": "2026-01-22T11:15:00", "status": "APROVADA", "description": "Aprovada pelo comitê de crédito", "author": "Comitê de Crédito"},
        ],
        "PROP-2026-0002": [
            {"timestamp": "2026-01-18T10:00:00", "status": "EM_ANALISE", "description": "Proposta recebida e protocolada", "author": "Sistema"},
        ],
        "PROP-2026-0003": [
            {"timestamp": "2025-12-05T08:30:00", "status": "EM_ANALISE", "description": "Proposta criada", "author": "Sistema"},
            {"timestamp": "2025-12-15T16:45:00", "status": "APROVADA", "description": "Aprovada via score automático", "author": "Sistema Automático"},
            {"timestamp": "2026-01-12T09:00:00", "status": "LIBERADA", "description": "Recursos liberados em conta", "author": "Juliana Reis Tavares"},
        ],
        "PROP-2026-0004": [
            {"timestamp": "2026-01-25T13:20:00", "status": "EM_ANALISE", "description": "Proposta cadastrada", "author": "Sistema"},
            {"timestamp": "2026-01-28T10:00:00", "status": "PENDENTE_DOCUMENTACAO", "description": "Pendência de documentação rural", "author": "Ricardo Oliveira"},
        ],
    }

    for p in proposals_seed:
        pid = str(uuid.uuid4())
        history = history_seed.get(p["codigo"], [])
        await db.proposals.insert_one(
            {**p, "id": pid, "history": history, "created_at": now, "updated_at": now}
        )


# ----------------------------------------------------------------------------
# Public Routes (Cliente)
# ----------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"service": "Valida BACEN API", "version": "2.0.0", "status": "online"}


@api_router.post("/proposals/validate")
async def validate_proposal(payload: ValidateProposalRequest):
    cnpj = payload.cnpj.strip()
    codigo = payload.codigo.strip().upper()
    token = payload.token.strip().upper()

    proposal = await db.proposals.find_one({"codigo": codigo, "token": token}, {"_id": 0})
    if not proposal:
        raise HTTPException(
            status_code=404,
            detail="Proposta não encontrada. Verifique o código e o token informados.",
        )

    company = await db.companies.find_one({"id": proposal["company_id"]}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa vinculada não localizada.")

    if company["cnpj"].strip() != cnpj:
        raise HTTPException(
            status_code=403,
            detail="CNPJ informado não corresponde à empresa desta proposta.",
        )

    return {
        "proposal": serialize_doc(proposal),
        "company": serialize_doc(company),
    }


# ----------------------------------------------------------------------------
# Auth Routes
# ----------------------------------------------------------------------------
@api_router.post("/auth/login", response_model=TokenResponse)
async def login(creds: Login):
    email = creds.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(creds.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    token = create_access_token(
        subject=email, name=user["name"], role=user["role"], user_id=user["id"]
    )
    return TokenResponse(
        access_token=token,
        user={
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
        },
    )


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_doc(user)


# ----------------------------------------------------------------------------
# Dashboard (admin sees all, gerente sees only own)
# ----------------------------------------------------------------------------
@api_router.get("/admin/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    query = {} if user["role"] == "admin" else {"gerente_id": user["id"]}
    total_proposals = await db.proposals.count_documents(query)
    total_companies = (
        await db.companies.count_documents({})
        if user["role"] == "admin"
        else len(
            list(
                {
                    p["company_id"]
                    async for p in db.proposals.find(query, {"_id": 0, "company_id": 1})
                }
            )
        )
    )

    statuses = ["EM_ANALISE", "APROVADA", "REPROVADA", "LIBERADA", "PENDENTE_DOCUMENTACAO"]
    by_status = {}
    for s in statuses:
        q = {**query, "status": s}
        by_status[s] = await db.proposals.count_documents(q)

    cursor = db.proposals.find(query, {"_id": 0}).sort("created_at", -1).limit(5)
    recent = [serialize_doc(p) for p in await cursor.to_list(length=5)]

    pipeline = [
        {"$match": query},
        {"$group": {"_id": None, "total": {"$sum": "$valor_aprovado"}}},
    ]
    res = await db.proposals.aggregate(pipeline).to_list(length=1)
    total_aprovado = res[0]["total"] if res else 0

    return {
        "total_proposals": total_proposals,
        "total_companies": total_companies,
        "by_status": by_status,
        "total_valor_aprovado": total_aprovado,
        "recent_proposals": recent,
    }


# ----------------------------------------------------------------------------
# Users (admin only)
# ----------------------------------------------------------------------------
@api_router.get("/admin/users")
async def list_users(admin: dict = Depends(get_current_admin)):
    cursor = db.users.find({}, {"_id": 0, "password_hash": 0}).sort("name", 1)
    items = await cursor.to_list(length=500)
    return [serialize_doc(u) for u in items]


@api_router.get("/admin/users/gerentes")
async def list_gerentes(user: dict = Depends(get_current_user)):
    """Used by both admin (to assign) and gerente (to see self)."""
    cursor = db.users.find({"role": "gerente"}, {"_id": 0, "password_hash": 0}).sort("name", 1)
    items = await cursor.to_list(length=500)
    return [serialize_doc(u) for u in items]


@api_router.post("/admin/users", status_code=201)
async def create_user(data: UserCreate, admin: dict = Depends(get_current_admin)):
    if await db.users.find_one({"email": data.email.lower()}):
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "email": data.email.lower().strip(),
        "name": data.name,
        "role": data.role,
        "password_hash": hash_password(data.password),
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await db.users.insert_one(doc)
    return serialize_doc(doc)


@api_router.put("/admin/users/{user_id}")
async def update_user(
    user_id: str, data: UserUpdate, admin: dict = Depends(get_current_admin)
):
    update = {}
    payload = data.model_dump(exclude_unset=True)
    if "password" in payload and payload["password"]:
        update["password_hash"] = hash_password(payload.pop("password"))
    if "email" in payload and payload["email"]:
        payload["email"] = payload["email"].lower().strip()
    update.update(payload)
    update["updated_at"] = now_utc()
    result = await db.users.update_one({"id": user_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return serialize_doc(updated)


@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_current_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Não é possível excluir a própria conta")
    used = await db.proposals.count_documents({"gerente_id": user_id})
    if used > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Este gerente possui {used} proposta(s) vinculada(s). Desvincule antes.",
        )
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {"ok": True}


# ----------------------------------------------------------------------------
# Companies CRUD (admin only)
# ----------------------------------------------------------------------------
@api_router.get("/admin/companies")
async def list_companies(user: dict = Depends(get_current_user)):
    cursor = db.companies.find({}, {"_id": 0}).sort("razao_social", 1)
    items = await cursor.to_list(length=500)
    return [serialize_doc(c) for c in items]


@api_router.get("/admin/companies/{company_id}")
async def get_company(company_id: str, user: dict = Depends(get_current_user)):
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return serialize_doc(company)


@api_router.post("/admin/companies", status_code=201)
async def create_company(data: CompanyCreate, admin: dict = Depends(get_current_admin)):
    if await db.companies.find_one({"cnpj": data.cnpj}):
        raise HTTPException(status_code=409, detail="CNPJ já cadastrado")
    cid = str(uuid.uuid4())
    now = now_utc()
    doc = {**data.model_dump(), "id": cid, "created_at": now, "updated_at": now}
    await db.companies.insert_one(doc)
    return serialize_doc(doc)


@api_router.put("/admin/companies/{company_id}")
async def update_company(
    company_id: str, data: CompanyUpdate, admin: dict = Depends(get_current_admin)
):
    update = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
    update["updated_at"] = now_utc()
    result = await db.companies.update_one({"id": company_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    updated = await db.companies.find_one({"id": company_id}, {"_id": 0})
    return serialize_doc(updated)


@api_router.delete("/admin/companies/{company_id}")
async def delete_company(company_id: str, admin: dict = Depends(get_current_admin)):
    used = await db.proposals.count_documents({"company_id": company_id})
    if used > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Esta empresa possui {used} proposta(s) vinculada(s).",
        )
    result = await db.companies.delete_one({"id": company_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return {"ok": True}


# ----------------------------------------------------------------------------
# Proposals CRUD - role-aware
# ----------------------------------------------------------------------------
def _scope_query(user: dict, base: dict = None) -> dict:
    base = base or {}
    if user["role"] == "gerente":
        base["gerente_id"] = user["id"]
    return base


@api_router.get("/admin/proposals")
async def list_proposals(
    user: dict = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
):
    query = _scope_query(user)
    if status_filter:
        query["status"] = status_filter
    if search:
        query["$or"] = [
            {"codigo": {"$regex": search, "$options": "i"}},
            {"token": {"$regex": search, "$options": "i"}},
            {"banco": {"$regex": search, "$options": "i"}},
        ]
    cursor = db.proposals.find(query, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(length=500)

    company_ids = list({i["company_id"] for i in items})
    companies = {}
    if company_ids:
        async for c in db.companies.find({"id": {"$in": company_ids}}, {"_id": 0}):
            companies[c["id"]] = serialize_doc(c)

    gerente_ids = list({i.get("gerente_id") for i in items if i.get("gerente_id")})
    gerentes = {}
    if gerente_ids:
        async for g in db.users.find(
            {"id": {"$in": gerente_ids}}, {"_id": 0, "password_hash": 0}
        ):
            gerentes[g["id"]] = serialize_doc(g)

    return [
        {
            **serialize_doc(i),
            "company": companies.get(i["company_id"]),
            "gerente": gerentes.get(i.get("gerente_id")) if i.get("gerente_id") else None,
        }
        for i in items
    ]


@api_router.get("/admin/proposals/{proposal_id}")
async def get_proposal(proposal_id: str, user: dict = Depends(get_current_user)):
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    if user["role"] == "gerente" and proposal.get("gerente_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Você não tem acesso a esta proposta")
    company = await db.companies.find_one({"id": proposal["company_id"]}, {"_id": 0})
    gerente = None
    if proposal.get("gerente_id"):
        gerente = await db.users.find_one(
            {"id": proposal["gerente_id"]}, {"_id": 0, "password_hash": 0}
        )
    return {
        **serialize_doc(proposal),
        "company": serialize_doc(company) if company else None,
        "gerente": serialize_doc(gerente) if gerente else None,
    }


@api_router.post("/admin/proposals", status_code=201)
async def create_proposal(
    data: ProposalCreate, user: dict = Depends(get_current_user)
):
    if not await db.companies.find_one({"id": data.company_id}):
        raise HTTPException(status_code=404, detail="Empresa vinculada não encontrada")
    if await db.proposals.find_one({"codigo": data.codigo}):
        raise HTTPException(status_code=409, detail="Código de proposta já existe")
    if await db.proposals.find_one({"token": data.token}):
        raise HTTPException(status_code=409, detail="Token já existe")
    if await db.proposals.find_one({"company_id": data.company_id}):
        raise HTTPException(
            status_code=409,
            detail="Esta empresa (CNPJ) já possui uma proposta cadastrada. Apenas 1 proposta por CNPJ é permitida.",
        )

    payload = data.model_dump()
    # gerente role: force gerente_id to self
    if user["role"] == "gerente":
        payload["gerente_id"] = user["id"]
    # admin: validate gerente_id if provided
    elif payload.get("gerente_id"):
        ger = await db.users.find_one(
            {"id": payload["gerente_id"], "role": "gerente"}
        )
        if not ger:
            raise HTTPException(status_code=404, detail="Gerente vinculado não encontrado")

    pid = str(uuid.uuid4())
    now = now_utc()
    history = [
        {
            "timestamp": now.isoformat(),
            "status": payload["status"],
            "description": "Proposta criada",
            "author": user["name"],
        }
    ]
    doc = {
        **payload,
        "id": pid,
        "history": history,
        "created_at": now,
        "updated_at": now,
    }
    await db.proposals.insert_one(doc)
    return serialize_doc(doc)


@api_router.put("/admin/proposals/{proposal_id}")
async def update_proposal(
    proposal_id: str,
    data: ProposalUpdate,
    user: dict = Depends(get_current_user),
):
    existing = await db.proposals.find_one({"id": proposal_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    if user["role"] == "gerente" and existing.get("gerente_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Você não tem acesso a esta proposta")

    update = {k: v for k, v in data.model_dump(exclude_unset=True).items()}

    # gerente cannot reassign
    if user["role"] == "gerente":
        update.pop("gerente_id", None)
    elif "gerente_id" in update and update["gerente_id"]:
        ger = await db.users.find_one({"id": update["gerente_id"], "role": "gerente"})
        if not ger:
            raise HTTPException(status_code=404, detail="Gerente vinculado não encontrado")

    # Unique company per proposal check
    if "company_id" in update and update["company_id"] != existing.get("company_id"):
        if await db.proposals.find_one(
            {"company_id": update["company_id"], "id": {"$ne": proposal_id}}
        ):
            raise HTTPException(
                status_code=409,
                detail="Esta empresa já possui uma proposta cadastrada.",
            )

    update["updated_at"] = now_utc()

    new_status = update.get("status")
    if new_status and new_status != existing.get("status"):
        history = existing.get("history", [])
        history.append(
            {
                "timestamp": now_utc().isoformat(),
                "status": new_status,
                "description": f"Status alterado para {new_status}",
                "author": user["name"],
            }
        )
        update["history"] = history

    await db.proposals.update_one({"id": proposal_id}, {"$set": update})
    updated = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    return serialize_doc(updated)


@api_router.delete("/admin/proposals/{proposal_id}")
async def delete_proposal(proposal_id: str, user: dict = Depends(get_current_user)):
    existing = await db.proposals.find_one({"id": proposal_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    if user["role"] == "gerente" and existing.get("gerente_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Você não tem acesso a esta proposta")
    await db.proposals.delete_one({"id": proposal_id})
    return {"ok": True}


# ----------------------------------------------------------------------------
# Proposal History (manual entries)
# ----------------------------------------------------------------------------
@api_router.post("/admin/proposals/{proposal_id}/history", status_code=201)
async def add_history_entry(
    proposal_id: str,
    entry: HistoryEntryCreate,
    user: dict = Depends(get_current_user),
):
    proposal = await db.proposals.find_one({"id": proposal_id})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    if user["role"] == "gerente" and proposal.get("gerente_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Você não tem acesso a esta proposta")

    new_entry = entry.model_dump()
    history = proposal.get("history", [])
    history.append(new_entry)
    await db.proposals.update_one(
        {"id": proposal_id},
        {"$set": {"history": history, "updated_at": now_utc()}},
    )
    return new_entry


@api_router.delete("/admin/proposals/{proposal_id}/history/{index}")
async def delete_history_entry(
    proposal_id: str, index: int, user: dict = Depends(get_current_user)
):
    proposal = await db.proposals.find_one({"id": proposal_id})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    if user["role"] == "gerente" and proposal.get("gerente_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Você não tem acesso a esta proposta")
    history = proposal.get("history", [])
    if index < 0 or index >= len(history):
        raise HTTPException(status_code=404, detail="Entrada de histórico não encontrada")
    history.pop(index)
    await db.proposals.update_one(
        {"id": proposal_id},
        {"$set": {"history": history, "updated_at": now_utc()}},
    )
    return {"ok": True}


# ----------------------------------------------------------------------------
# Wire-up
# ----------------------------------------------------------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
