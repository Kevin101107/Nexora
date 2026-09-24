import pytest


def test_project_resources_crud_and_permissions(client):
    # 1. Create a project by user-alice
    p_res = client.post("/api/projects", json={
        "title": "Resource Test Project",
        "description": "Testing resource attachments",
        "category": "hackathon",
        "visibility": "public",
    }, headers={"Authorization": "Bearer user-alice"})
    assert p_res.status_code == 201
    proj_id = p_res.json()["id"]

    # 2. Add resource as owner
    r_res = client.post(f"/api/projects/{proj_id}/resources", json={
        "title": "GitHub Repo",
        "url": "https://github.com/project/test",
        "category": "github",
        "description": "Source code repository",
    }, headers={"Authorization": "Bearer user-alice"})
    assert r_res.status_code == 201
    resource = r_res.json()
    assert resource["title"] == "GitHub Repo"
    assert resource["created_by"] == "user-alice"
    res_id = resource["id"]

    # 3. List resources
    list_res = client.get(f"/api/projects/{proj_id}/resources")
    assert list_res.status_code == 200
    resources = list_res.json()
    assert len(resources) == 1
    assert resources[0]["id"] == res_id

    # 4. Non-member (user-bob) cannot add resources to user-alice's project
    non_mem_res = client.post(f"/api/projects/{proj_id}/resources", json={
        "title": "Unwanted Link",
        "url": "https://spam.com",
        "category": "other",
    }, headers={"Authorization": "Bearer user-bob"})
    assert non_mem_res.status_code == 403

    # 5. Non-member cannot delete resource
    del_forbidden = client.delete(f"/api/projects/{proj_id}/resources/{res_id}", headers={"Authorization": "Bearer user-bob"})
    assert del_forbidden.status_code == 403

    # 6. Owner can delete resource
    del_res = client.delete(f"/api/projects/{proj_id}/resources/{res_id}", headers={"Authorization": "Bearer user-alice"})
    assert del_res.status_code == 204

    # 7. List again is empty
    list_after = client.get(f"/api/projects/{proj_id}/resources")
    assert list_after.status_code == 200
    assert len(list_after.json()) == 0
