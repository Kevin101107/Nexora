import pytest
from typing import Dict, Any, List
from fastapi.testclient import TestClient
from main import app


class MockResponse:
    def __init__(self, data=None, count=None):
        self.data = data if data is not None else []
        self.count = count if count is not None else len(self.data)


class MockTableQuery:
    def __init__(self, db: Dict[str, List[Dict[str, Any]]], table_name: str):
        self.db = db
        self.table_name = table_name
        self.rows = [dict(r) for r in self.db.setdefault(table_name, [])]
        self._action = "select"
        self._update_data = None
        self._insert_data = None
        self._count_mode = None
        self._filters = []
        self._order_col = None
        self._order_desc = False

    def select(self, columns: str = "*", count: str = None):
        self._action = "select"
        self._count_mode = count
        return self

    def insert(self, data):
        self._action = "insert"
        self._insert_data = [data] if isinstance(data, dict) else list(data)
        return self

    def upsert(self, data):
        self._action = "upsert"
        self._insert_data = [data] if isinstance(data, dict) else list(data)
        return self

    def update(self, data):
        self._action = "update"
        self._update_data = data
        return self

    def delete(self):
        self._action = "delete"
        return self

    def eq(self, column: str, value: Any):
        self._filters.append(("eq", column, value))
        return self

    def neq(self, column: str, value: Any):
        self._filters.append(("neq", column, value))
        return self

    def or_(self, filter_expr: str):
        self._filters.append(("or", filter_expr))
        return self

    def order(self, column: str, desc: bool = False):
        self._order_col = column
        self._order_desc = desc
        return self

    def execute(self):
        target_table = self.db.setdefault(self.table_name, [])

        if self._action == "insert":
            for row in self._insert_data:
                target_table.append(dict(row))
            return MockResponse(data=self._insert_data)

        if self._action == "upsert":
            for row in self._insert_data:
                row_id = row.get("id")
                idx = next((i for i, r in enumerate(target_table) if r.get("id") == row_id), None)
                if idx is not None:
                    target_table[idx].update(row)
                else:
                    target_table.append(dict(row))
            return MockResponse(data=self._insert_data)

        # Filter for select, update, delete
        matched_indices = []
        for idx, row in enumerate(target_table):
            match = True
            for f in self._filters:
                if f[0] == "eq":
                    if row.get(f[1]) != f[2]:
                        match = False
                        break
                elif f[0] == "neq":
                    if row.get(f[1]) == f[2]:
                        match = False
                        break
                elif f[0] == "or":
                    # Simple parser for "col1.eq.val1,col2.eq.val2"
                    parts = f[1].split(",")
                    or_match = False
                    for part in parts:
                        sub = part.split(".eq.")
                        if len(sub) == 2 and row.get(sub[0]) == sub[1]:
                            or_match = True
                            break
                    if not or_match:
                        match = False
                        break
            if match:
                matched_indices.append(idx)

        if self._action == "update":
            updated_rows = []
            for idx in matched_indices:
                target_table[idx].update(self._update_data)
                updated_rows.append(dict(target_table[idx]))
            return MockResponse(data=updated_rows)

        if self._action == "delete":
            deleted_rows = [dict(target_table[idx]) for idx in reversed(matched_indices)]
            for idx in reversed(matched_indices):
                del target_table[idx]
            return MockResponse(data=deleted_rows)

        # select action
        results = [dict(target_table[idx]) for idx in matched_indices]
        if self._order_col:
            results.sort(
                key=lambda x: x.get(self._order_col) or "",
                reverse=self._order_desc,
            )
        count_val = len(results) if self._count_mode else None
        return MockResponse(data=results, count=count_val)


class MockDatabase:
    def __init__(self, db: Dict[str, List[Dict[str, Any]]]):
        self.db = db

    def table(self, table_name: str):
        return MockTableQuery(self.db, table_name)


@pytest.fixture
def mock_db():
    db: Dict[str, List[Dict[str, Any]]] = {
        "users": [
            {
                "id": "user-alice",
                "email": "alice@example.com",
                "display_name": "Alice Innovator",
                "username": "alice",
                "headline": "Full-Stack Dev | React & Python",
                "bio": "Passionate student builder",
                "skills": ["React", "FastAPI", "PostgreSQL"],
                "roles": ["Frontend", "Full-Stack"],
                "interests": ["FinTech", "EdTech"],
                "github_url": "https://github.com/alice",
                "linkedin_url": "https://linkedin.com/in/alice",
                "availability": "open",
            },
            {
                "id": "user-bob",
                "email": "bob@example.com",
                "display_name": "Bob Builder",
                "username": "bob",
                "headline": "Systems & Backend Specialist",
                "bio": "Building high-performance distributed systems",
                "skills": ["Go", "Docker", "PostgreSQL", "Kubernetes"],
                "roles": ["Backend", "DevOps"],
                "interests": ["Cloud Infra", "Open Source"],
                "github_url": "https://github.com/bob",
                "linkedin_url": None,
                "availability": "open",
            },
        ],
        "projects": [],
        "project_roles": [],
        "project_members": [],
        "project_applications": [],
        "teammate_requests": [],
        "tasks": [],
        "milestones": [],
        "project_activity": [],
    }
    return db


@pytest.fixture
def client(mock_db, monkeypatch):
    mock_database = MockDatabase(mock_db)
    
    async def mock_get_user_id(authorization: str) -> str:
        token = authorization.removeprefix("Bearer ").strip()
        if not token:
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="Unauthorized")
        return token

    modules_to_patch = [
        "app.core.database",
        "app.core.identity",
        "app.api.routes.users",
        "app.api.routes.projects",
        "app.api.routes.applications",
        "app.api.routes.requests",
        "app.api.routes.teams",
        "app.api.routes.matches",
        "app.api.routes.workspace",
    ]

    for mod in modules_to_patch:
        monkeypatch.setattr(f"{mod}.get_database", lambda: mock_database, raising=False)
        monkeypatch.setattr(f"{mod}.get_user_id", mock_get_user_id, raising=False)

    return TestClient(app)
