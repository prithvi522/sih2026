def test_health_checks_database(client):
    assert client.get("/api/health").json() == {"status": "ok", "database": "connected"}


def test_project_create_read_and_area_validation(client):
    created = client.post("/api/projects", json={"name": "Field study", "site_area_km2": "1.25"})
    assert created.status_code == 201
    assert client.get(f"/api/projects/{created.json()['id']}").json()["site_area_km2"] == 1.25
    assert client.post("/api/projects", json={"name": "Too small", "site_area_km2": 0.9}).status_code == 422


def test_proposal_duplicate_and_area_validation(client, project_id):
    payload = {"label": "A", "name": "Proposal A", "site_area_km2": 1}
    assert client.post(f"/api/projects/{project_id}/proposals", json=payload).status_code == 201
    assert client.post(f"/api/projects/{project_id}/proposals", json=payload).status_code == 409
    payload["label"] = "B"
    payload["site_area_km2"] = -1
    assert client.post(f"/api/projects/{project_id}/proposals", json=payload).status_code == 422


def test_analysis_comparison_only_uses_compatible_values(client, project_id):
    proposal_ids = []
    for label in ("A", "B"):
        created = client.post(f"/api/projects/{project_id}/proposals", json={"label": label, "name": f"Proposal {label}"})
        assert created.status_code == 201
        proposal_ids.append(created.json()["id"])
    assert client.get(f"/api/projects/{project_id}/comparison").status_code == 200
    values = ("4.5", "7.0")
    for proposal_id, value in zip(proposal_ids, values, strict=True):
        result = client.post(f"/api/proposals/{proposal_id}/analyses", json={
            "category": "Sun Hours", "value": value, "unit": "hours", "status": "analyzed", "data_source": "Forma report",
        })
        assert result.status_code == 201
    comparison = client.get(f"/api/projects/{project_id}/comparison").json()
    assert comparison["comparable_differences"][0]["difference_a_minus_b"] == "-2.500000"


def test_missing_proposal_has_clear_comparison_error(client, project_id):
    response = client.get(f"/api/projects/{project_id}/comparison")
    assert response.status_code == 422
    assert "requires both" in response.json()["detail"]


def test_proposal_update_delete(client, project_id):
    response = client.post(f"/api/projects/{project_id}/proposals", json={"label": "A", "name": "A"})
    proposal_id = response.json()["id"]
    assert client.put(f"/api/proposals/{proposal_id}", json={"name": "Updated"}).json()["name"] == "Updated"
    assert client.delete(f"/api/proposals/{proposal_id}").status_code == 204
    assert client.get(f"/api/proposals/{proposal_id}").status_code == 404


def test_invalid_urls_and_negative_building_counts_are_rejected(client, project_id):
    base = {"label": "A", "name": "A", "site_area_km2": 1}
    assert client.post(f"/api/projects/{project_id}/proposals", json={**base, "building_count": -1}).status_code == 422
    assert client.post(f"/api/projects/{project_id}/proposals", json={**base, "forma_board_url": "not a URL"}).status_code == 422


def test_analysis_categories_are_unique_and_values_retrieve(client, project_id):
    proposal = client.post(f"/api/projects/{project_id}/proposals", json={"label": "A", "name": "A"}).json()
    payload = {"category": "Noise Analysis", "value": "42", "unit": "dB(A)", "status": "imported", "data_source": "Report 3"}
    result = client.post(f"/api/proposals/{proposal['id']}/analyses", json=payload)
    assert result.status_code == 201
    assert client.post(f"/api/proposals/{proposal['id']}/analyses", json=payload).status_code == 409
    assert client.get(f"/api/proposals/{proposal['id']}/analyses").json()[0]["value"] == "42"
    assert client.put(f"/api/analyses/{result.json()['id']}", json={"notes": "Verified"}).json()["notes"] == "Verified"
    assert client.delete(f"/api/analyses/{result.json()['id']}").status_code == 204


def test_comparison_skips_incompatible_units(client, project_id):
    ids = []
    for label, unit in (("A", "hours"), ("B", "minutes")):
        proposal = client.post(f"/api/projects/{project_id}/proposals", json={"label": label, "name": label}).json()
        ids.append(proposal["id"])
        client.post(f"/api/proposals/{proposal['id']}/analyses", json={"category": "Sun Hours", "value": "2", "unit": unit, "status": "analyzed"})
    comparison = client.get(f"/api/projects/{project_id}/comparison").json()
    assert not any(item["category"] == "Sun Hours" for item in comparison["comparable_differences"])


def test_comparison_skips_incompatible_reporting_scope(client, project_id):
    for label, scope in (("A", "site"), ("B", "building")):
        proposal = client.post(f"/api/projects/{project_id}/proposals", json={"label": label, "name": label}).json()
        client.post(f"/api/proposals/{proposal['id']}/analyses", json={"category": "Solar Energy", "value": "12", "unit": "kWh", "scope": scope, "status": "analyzed"})
    comparison = client.get(f"/api/projects/{project_id}/comparison").json()
    assert not any(item["category"] == "Solar Energy" for item in comparison["comparable_differences"])


def test_analysis_rejects_non_finite_and_out_of_range_numbers(client, project_id):
    proposal = client.post(f"/api/projects/{project_id}/proposals", json={"label": "A", "name": "A"}).json()
    base = {"category": "Sun Hours", "unit": "hours", "status": "analyzed"}
    assert client.post(f"/api/proposals/{proposal['id']}/analyses", json={**base, "value": "NaN"}).status_code == 422
    assert client.post(f"/api/proposals/{proposal['id']}/analyses", json={**base, "value": "1e40"}).status_code == 422
    assert client.post(f"/api/projects/{project_id}/proposals", json={"label": "A", "name": "A", "unexpected": True}).status_code == 422


def test_project_update_and_delete(client):
    project = client.post("/api/projects", json={"name": "Before"}).json()
    project_id = project["id"]
    assert client.put(f"/api/projects/{project_id}", json={"name": "After", "site_area_km2": 0.5}).status_code == 422
    assert client.put(f"/api/projects/{project_id}", json={"name": "After"}).json()["name"] == "After"
    assert client.delete(f"/api/projects/{project_id}").status_code == 204
    assert client.get(f"/api/projects/{project_id}").status_code == 404
