"""
Valida BACEN - Backend regression tests
Covers: public validate endpoint, auth, dashboard, proposals & companies CRUD,
role-based access (admin vs gerente), manual history endpoints.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bacen-validator.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@validabacen.com"
ADMIN_PASSWORD = "Admin@123"
GERENTE_EMAIL = "gerente@validabacen.com"
GERENTE_PASSWORD = "Gerente@123"

VALID_CNPJ = "12.345.678/0001-90"
VALID_CODIGO = "PROP-2026-0001"
VALID_TOKEN = "VB-A4F9-K2M7-X8P1"


# --------------------------------------------------------------------------
# Fixtures
# --------------------------------------------------------------------------
@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(http):
    r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def gerente_token(http):
    r = http.post(f"{API}/auth/login", json={"email": GERENTE_EMAIL, "password": GERENTE_PASSWORD})
    assert r.status_code == 200, f"gerente login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def H(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# --------------------------------------------------------------------------
# Public validate
# --------------------------------------------------------------------------
class TestPublicValidate:
    def test_validate_success(self, http):
        r = http.post(f"{API}/proposals/validate", json={
            "cnpj": VALID_CNPJ, "codigo": VALID_CODIGO, "token": VALID_TOKEN
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert "proposal" in body and "company" in body
        assert body["proposal"]["codigo"] == VALID_CODIGO
        assert body["proposal"]["token"] == VALID_TOKEN
        assert body["company"]["cnpj"] == VALID_CNPJ
        # ensure no _id or password_hash leaks
        assert "_id" not in body["proposal"]
        assert "_id" not in body["company"]

    def test_validate_invalid_token_404(self, http):
        r = http.post(f"{API}/proposals/validate", json={
            "cnpj": VALID_CNPJ, "codigo": VALID_CODIGO, "token": "VB-XXXX-XXXX-XXXX"
        })
        assert r.status_code == 404
        assert "detail" in r.json()

    def test_validate_wrong_cnpj_403(self, http):
        r = http.post(f"{API}/proposals/validate", json={
            "cnpj": "99.999.999/0001-99", "codigo": VALID_CODIGO, "token": VALID_TOKEN
        })
        assert r.status_code == 403


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------
class TestAuth:
    def test_admin_login_success(self, http):
        r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        body = r.json()
        assert body["user"]["role"] == "admin"
        assert body["user"]["email"] == ADMIN_EMAIL
        assert isinstance(body["access_token"], str) and len(body["access_token"]) > 10

    def test_gerente_login_success(self, http):
        r = http.post(f"{API}/auth/login", json={"email": GERENTE_EMAIL, "password": GERENTE_PASSWORD})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "gerente"

    def test_login_wrong_password(self, http):
        r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "WRONG"})
        assert r.status_code == 401

    def test_me_returns_user(self, http, admin_token):
        r = http.get(f"{API}/auth/me", headers=H(admin_token))
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "password_hash" not in data


# --------------------------------------------------------------------------
# Dashboard scoping
# --------------------------------------------------------------------------
class TestDashboard:
    def test_admin_dashboard_full(self, http, admin_token):
        r = http.get(f"{API}/admin/dashboard", headers=H(admin_token))
        assert r.status_code == 200
        data = r.json()
        assert data["total_proposals"] >= 4
        assert data["total_companies"] >= 4
        assert "by_status" in data

    def test_gerente_dashboard_scoped(self, http, gerente_token):
        r = http.get(f"{API}/admin/dashboard", headers=H(gerente_token))
        assert r.status_code == 200
        data = r.json()
        # Gerente owns PROP-2026-0001 and PROP-2026-0003
        assert data["total_proposals"] == 2


# --------------------------------------------------------------------------
# Proposals list scoping & access
# --------------------------------------------------------------------------
class TestProposalsListing:
    def test_admin_sees_all(self, http, admin_token):
        r = http.get(f"{API}/admin/proposals", headers=H(admin_token))
        assert r.status_code == 200
        items = r.json()
        codes = {p["codigo"] for p in items}
        assert {"PROP-2026-0001", "PROP-2026-0002", "PROP-2026-0003", "PROP-2026-0004"}.issubset(codes)

    def test_gerente_sees_only_assigned(self, http, gerente_token):
        r = http.get(f"{API}/admin/proposals", headers=H(gerente_token))
        assert r.status_code == 200
        items = r.json()
        codes = {p["codigo"] for p in items}
        assert codes == {"PROP-2026-0001", "PROP-2026-0003"}

    def test_gerente_403_on_unassigned(self, http, admin_token, gerente_token):
        # find PROP-2026-0002 id
        r = http.get(f"{API}/admin/proposals", headers=H(admin_token))
        target = next(p for p in r.json() if p["codigo"] == "PROP-2026-0002")
        r2 = http.get(f"{API}/admin/proposals/{target['id']}", headers=H(gerente_token))
        assert r2.status_code == 403

    def test_admin_get_any(self, http, admin_token):
        r = http.get(f"{API}/admin/proposals", headers=H(admin_token))
        target = next(p for p in r.json() if p["codigo"] == "PROP-2026-0002")
        r2 = http.get(f"{API}/admin/proposals/{target['id']}", headers=H(admin_token))
        assert r2.status_code == 200


# --------------------------------------------------------------------------
# Proposals create / update / delete with business rules
# --------------------------------------------------------------------------
def _proposal_payload(company_id, suffix, gerente_id=None):
    return {
        "codigo": f"PROP-TEST-{suffix}",
        "token": f"VB-TEST-{suffix}",
        "company_id": company_id,
        "gerente_id": gerente_id,
        "banco": "Banco Teste",
        "codigo_bancario": "999",
        "gerente_responsavel": "Tester",
        "codigo_interno": f"INT-{suffix}",
        "agencia": "0001",
        "conta": "00000000-0",
        "valor_solicitado": 100000.0,
        "valor_aprovado": 0.0,
        "prazo_meses": 12,
        "taxa_juros": 1.0,
        "cet": 12.0,
        "tipo_operacao": "Test",
        "modalidade_credito": "Test",
        "garantias": "Test",
        "data_solicitacao": "2026-01-01",
        "data_aprovacao": None,
        "validade_proposta": "2026-12-31",
        "faturamento_anual": 1000000.0,
        "segmento": "Test",
        "porte": "PEQUENA",
        "score_interno": 600,
        "status": "EM_ANALISE",
        "observacoes": "",
    }


class TestProposalsCRUD:
    created_ids = []

    def test_create_duplicate_company_409(self, http, admin_token):
        # company already used by PROP-2026-0001
        r = http.get(f"{API}/admin/proposals", headers=H(admin_token))
        existing = next(p for p in r.json() if p["codigo"] == "PROP-2026-0001")
        payload = _proposal_payload(existing["company_id"], suffix=uuid.uuid4().hex[:6])
        r2 = http.post(f"{API}/admin/proposals", headers=H(admin_token), json=payload)
        assert r2.status_code == 409

    def test_gerente_create_forces_own_id(self, http, admin_token, gerente_token):
        # create a fresh company first
        cnpj = f"77.{uuid.uuid4().int % 1000:03d}.{uuid.uuid4().int % 1000:03d}/0001-{uuid.uuid4().int % 100:02d}"
        comp = {
            "razao_social": "Empresa Teste", "nome_fantasia": "Teste",
            "cnpj": cnpj, "situacao_cadastral": "ATIVA",
            "endereco": "Rua Test", "cidade": "SP", "estado": "SP",
            "telefone": "(11) 0000-0000", "email": "t@t.com",
            "responsavel_legal": "Teste", "data_abertura": "2020-01-01",
        }
        rc = http.post(f"{API}/admin/companies", headers=H(admin_token), json=comp)
        assert rc.status_code == 201, rc.text
        company_id = rc.json()["id"]

        # gerente creates, passes fake gerente_id - must be overwritten
        payload = _proposal_payload(company_id, suffix=uuid.uuid4().hex[:6],
                                    gerente_id="fake-id-should-be-overwritten")
        rp = http.post(f"{API}/admin/proposals", headers=H(gerente_token), json=payload)
        assert rp.status_code == 201, rp.text
        created = rp.json()
        TestProposalsCRUD.created_ids.append(created["id"])

        # Check gerente_id is self
        me = http.get(f"{API}/auth/me", headers=H(gerente_token)).json()
        assert created["gerente_id"] == me["id"]

    def test_update_status_appends_history(self, http, gerente_token):
        # use a created proposal
        assert TestProposalsCRUD.created_ids
        pid = TestProposalsCRUD.created_ids[0]
        before = http.get(f"{API}/admin/proposals/{pid}", headers=H(gerente_token)).json()
        prev_len = len(before.get("history", []))
        ru = http.put(f"{API}/admin/proposals/{pid}", headers=H(gerente_token),
                      json={"status": "APROVADA"})
        assert ru.status_code == 200, ru.text
        after = ru.json()
        assert after["status"] == "APROVADA"
        assert len(after["history"]) == prev_len + 1
        assert after["history"][-1]["status"] == "APROVADA"

    def test_gerente_cannot_delete_others(self, http, admin_token, gerente_token):
        r = http.get(f"{API}/admin/proposals", headers=H(admin_token))
        target = next(p for p in r.json() if p["codigo"] == "PROP-2026-0002")
        rd = http.delete(f"{API}/admin/proposals/{target['id']}", headers=H(gerente_token))
        assert rd.status_code == 403


# --------------------------------------------------------------------------
# History endpoints
# --------------------------------------------------------------------------
class TestHistory:
    def test_add_and_delete_history_entry(self, http, admin_token):
        r = http.get(f"{API}/admin/proposals", headers=H(admin_token))
        target = next(p for p in r.json() if p["codigo"] == "PROP-2026-0004")
        pid = target["id"]
        before = http.get(f"{API}/admin/proposals/{pid}", headers=H(admin_token)).json()
        prev_len = len(before["history"])

        entry = {
            "timestamp": "2026-02-10T14:30:00",
            "status": "EM_ANALISE",
            "description": "Movimentação manual de teste",
            "author": "Pytest",
        }
        ra = http.post(f"{API}/admin/proposals/{pid}/history", headers=H(admin_token), json=entry)
        assert ra.status_code == 201, ra.text
        body = ra.json()
        assert body["description"] == entry["description"]
        assert body["author"] == "Pytest"

        after = http.get(f"{API}/admin/proposals/{pid}", headers=H(admin_token)).json()
        assert len(after["history"]) == prev_len + 1

        # delete the entry we just added
        idx = len(after["history"]) - 1
        rd = http.delete(f"{API}/admin/proposals/{pid}/history/{idx}", headers=H(admin_token))
        assert rd.status_code == 200

        final = http.get(f"{API}/admin/proposals/{pid}", headers=H(admin_token)).json()
        assert len(final["history"]) == prev_len


# --------------------------------------------------------------------------
# Companies CRUD + role restrictions
# --------------------------------------------------------------------------
class TestCompanies:
    def test_admin_crud(self, http, admin_token):
        cnpj = f"88.{uuid.uuid4().int % 1000:03d}.{uuid.uuid4().int % 1000:03d}/0001-{uuid.uuid4().int % 100:02d}"
        comp = {
            "razao_social": "TESTE Empresa CRUD",
            "nome_fantasia": "TesteCRUD", "cnpj": cnpj,
            "situacao_cadastral": "ATIVA", "endereco": "x",
            "cidade": "SP", "estado": "SP", "telefone": "(11) 0000-0000",
            "email": "x@x.com", "responsavel_legal": "X", "data_abertura": "2020-01-01",
        }
        rc = http.post(f"{API}/admin/companies", headers=H(admin_token), json=comp)
        assert rc.status_code == 201, rc.text
        cid = rc.json()["id"]

        ru = http.put(f"{API}/admin/companies/{cid}", headers=H(admin_token),
                      json={"nome_fantasia": "TesteCRUD-Updated"})
        assert ru.status_code == 200
        assert ru.json()["nome_fantasia"] == "TesteCRUD-Updated"

        rd = http.delete(f"{API}/admin/companies/{cid}", headers=H(admin_token))
        assert rd.status_code == 200

    def test_delete_blocked_when_proposals_exist(self, http, admin_token):
        r = http.get(f"{API}/admin/proposals", headers=H(admin_token))
        target = next(p for p in r.json() if p["codigo"] == "PROP-2026-0001")
        rd = http.delete(f"{API}/admin/companies/{target['company_id']}", headers=H(admin_token))
        assert rd.status_code == 409

    def test_gerente_cannot_modify_companies(self, http, gerente_token):
        comp = {
            "razao_social": "x", "nome_fantasia": "x", "cnpj": "99.999.999/0001-00",
            "situacao_cadastral": "ATIVA", "endereco": "x", "cidade": "x", "estado": "x",
            "telefone": "x", "email": "g@g.com", "responsavel_legal": "x", "data_abertura": "2020-01-01",
        }
        rp = http.post(f"{API}/admin/companies", headers=H(gerente_token), json=comp)
        assert rp.status_code == 403

    def test_gerente_can_list_companies(self, http, gerente_token):
        r = http.get(f"{API}/admin/companies", headers=H(gerente_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# --------------------------------------------------------------------------
# Users CRUD - admin only
# --------------------------------------------------------------------------
class TestUsers:
    def test_admin_user_crud(self, http, admin_token):
        email = f"test_user_{uuid.uuid4().hex[:6]}@validabacen.com"
        rc = http.post(f"{API}/admin/users", headers=H(admin_token), json={
            "email": email, "name": "Test User", "password": "Test@123", "role": "gerente",
        })
        assert rc.status_code == 201, rc.text
        uid = rc.json()["id"]
        assert "password_hash" not in rc.json()

        ru = http.put(f"{API}/admin/users/{uid}", headers=H(admin_token), json={"name": "Renamed"})
        assert ru.status_code == 200
        assert ru.json()["name"] == "Renamed"

        rd = http.delete(f"{API}/admin/users/{uid}", headers=H(admin_token))
        assert rd.status_code == 200

    def test_gerente_cannot_list_users(self, http, gerente_token):
        r = http.get(f"{API}/admin/users", headers=H(gerente_token))
        assert r.status_code == 403

    def test_gerente_cannot_create_user(self, http, gerente_token):
        r = http.post(f"{API}/admin/users", headers=H(gerente_token), json={
            "email": "x@x.com", "name": "x", "password": "x", "role": "gerente",
        })
        assert r.status_code == 403


# --------------------------------------------------------------------------
# Cleanup (best-effort)
# --------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def _cleanup(http):
    yield
    try:
        r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        if r.status_code == 200:
            token = r.json()["access_token"]
            # remove TEST proposals & their companies
            rp = http.get(f"{API}/admin/proposals", headers=H(token))
            if rp.status_code == 200:
                for p in rp.json():
                    if p["codigo"].startswith("PROP-TEST-"):
                        cid = p["company_id"]
                        http.delete(f"{API}/admin/proposals/{p['id']}", headers=H(token))
                        http.delete(f"{API}/admin/companies/{cid}", headers=H(token))
    except Exception:
        pass
