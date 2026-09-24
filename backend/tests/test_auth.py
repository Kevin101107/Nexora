import pytest
from app.core.auth import hash_password, verify_password, create_access_token, decode_access_token


def test_password_hashing():
    pwd = "securepassword123"
    pwd_hash, salt = hash_password(pwd)
    assert pwd_hash != pwd
    assert len(salt) > 10
    assert verify_password(pwd, pwd_hash, salt) is True
    assert verify_password("wrongpassword", pwd_hash, salt) is False


def test_token_creation_and_decoding():
    user_id = "user-12345"
    token = create_access_token(user_id=user_id, username="testuser", expires_in=3600)
    assert isinstance(token, str)
    assert len(token.split(".")) == 3

    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["username"] == "testuser"


def test_token_tampering():
    token = create_access_token("user-valid", "test")
    tampered = token[:-4] + "abcd"
    assert decode_access_token(tampered) is None


def test_register_and_login_flow(client):
    reg_data = {
        "email": "sarah.dev@university.edu",
        "password": "mypassword123",
        "username": "sarahdev",
        "display_name": "Sarah Developer",
        "headline": "Junior ML enthusiast",
        "college": "MIT",
        "department": "EECS",
        "year": "2027",
        "skills": ["Python", "PyTorch", "FastAPI"],
        "roles": ["AI / ML Engineer"],
    }
    # Register
    res = client.post("/api/auth/register", json=reg_data)
    assert res.status_code == 201
    body = res.json()
    assert "access_token" in body
    assert body["user"]["email"] == "sarah.dev@university.edu"
    assert body["user"]["college"] == "MIT"
    assert body["user"]["department"] == "EECS"
    token = body["access_token"]

    # Current user /me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "sarahdev"

    # Login with email
    login_res = client.post("/api/auth/login", json={
        "username_or_email": "sarah.dev@university.edu",
        "password": "mypassword123",
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

    # Login with username
    login_user_res = client.post("/api/auth/login", json={
        "username_or_email": "sarahdev",
        "password": "mypassword123",
    })
    assert login_user_res.status_code == 200

    # Wrong password
    fail_res = client.post("/api/auth/login", json={
        "username_or_email": "sarahdev",
        "password": "wrongpassword",
    })
    assert fail_res.status_code == 401


def test_duplicate_registration(client):
    user_data = {
        "email": "unique@nexora.dev",
        "password": "password123",
        "username": "uniquedev",
        "display_name": "Unique Dev",
    }
    r1 = client.post("/api/auth/register", json=user_data)
    assert r1.status_code == 201

    # Duplicate email
    r2 = client.post("/api/auth/register", json={
        "email": "unique@nexora.dev",
        "password": "password123",
        "username": "different_username",
        "display_name": "Other",
    })
    assert r2.status_code == 409

    # Duplicate username
    r3 = client.post("/api/auth/register", json={
        "email": "another@nexora.dev",
        "password": "password123",
        "username": "uniquedev",
        "display_name": "Other",
    })
    assert r3.status_code == 409


def test_demo_users_endpoint(client):
    res = client.get("/api/auth/demo-users")
    assert res.status_code == 200
    users = res.json()
    assert len(users) >= 4
    assert any(u["username"] == "maya" for u in users)
    assert any(u["username"] == "arjun" for u in users)


def test_production_mode_rejects_raw_mock_tokens(client, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "environment", "production")

    # In production, raw mock token strings without JWT signatures are rejected
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer user-alice"})
    assert res.status_code == 401
    assert "Invalid or expired authentication token" in res.json().get("detail", "")

    # But genuine signed JWT tokens are accepted
    valid_token = create_access_token("user-alice", "maya")
    res_valid = client.get("/api/auth/me", headers={"Authorization": f"Bearer {valid_token}"})
    assert res_valid.status_code == 200

