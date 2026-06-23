import pytest
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app import app, init_db

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        with c.session_transaction() as sess:
            sess["role"] = "admin"
            sess["username"] = "test"
        yield c


def test_index(client):
    rv = client.get("/")
    assert rv.status_code == 200
    assert b"DSL" in rv.data or b"Jinja2" in rv.data


def test_examples(client):
    rv = client.get("/examples/ventas")
    assert rv.status_code == 200
    data = rv.get_json()
    assert data["name"] == "Reporte de Ventas"

    rv = client.get("/examples/empleados")
    assert rv.status_code == 200
    data = rv.get_json()
    assert data["name"] == "Reporte de Empleados"

    rv = client.get("/examples/ventas_chart")
    assert rv.status_code == 200

    rv = client.get("/examples/permisos")
    assert rv.status_code == 200

    rv = client.get("/examples/demo_extrema")
    assert rv.status_code == 200

    rv = client.get("/examples/no_existe")
    assert rv.status_code == 404


def test_preview_ok(client):
    rv = client.post("/preview", json={
        "template": "<h1>{{ title }}</h1>",
        "data": json.dumps({"title": "Test"})
    })
    assert rv.status_code == 200
    assert rv.get_json()["html"] == "<h1>Test</h1>"


def test_preview_bad_json(client):
    rv = client.post("/preview", json={
        "template": "<h1>{{ title }}</h1>",
        "data": "not json"
    })
    assert rv.status_code == 400
    assert "JSON" in rv.get_json()["error"]


def test_preview_bad_template(client):
    rv = client.post("/preview", json={
        "template": "{% invalid %}",
        "data": "{}"
    })
    assert rv.status_code == 400
    assert "Jinja2" in rv.get_json()["error"]


def test_preview_injects_role(client):
    rv = client.post("/preview", json={
        "template": "{{ _role }}:{{ _user }}",
        "data": "{}"
    })
    assert rv.status_code == 200
    assert rv.get_json()["html"] == "admin:test"


def test_crud_templates(client):
    # Create
    rv = client.post("/api/templates", json={
        "name": "Test Template",
        "template": "<h1>{{ x }}</h1>",
        "data": '{"x": "hello"}',
        "visibility": "public",
    })
    assert rv.status_code == 201
    tid = rv.get_json()["id"]
    assert rv.get_json()["name"] == "Test Template"
    assert rv.get_json()["visibility"] == "public"

    # List
    rv = client.get("/api/templates")
    assert rv.status_code == 200
    ids = [t["id"] for t in rv.get_json()]
    assert tid in ids

    # Get
    rv = client.get(f"/api/templates/{tid}")
    assert rv.status_code == 200
    assert rv.get_json()["template"] == "<h1>{{ x }}</h1>"

    # Update
    rv = client.put(f"/api/templates/{tid}", json={"name": "Updated"})
    assert rv.status_code == 200
    assert rv.get_json()["version"] == 2

    # Delete
    rv = client.delete(f"/api/templates/{tid}")
    assert rv.status_code == 200

    # Verify deleted
    rv = client.get(f"/api/templates/{tid}")
    assert rv.status_code == 404


def test_set_role(client):
    rv = client.post("/set-role", json={"role": "admin", "username": "Admin", "password": "123456"})
    assert rv.status_code == 200
    assert rv.get_json()["role"] == "admin"

    # Wrong password
    rv = client.post("/set-role", json={"role": "admin", "username": "Admin", "password": "wrong"})
    assert rv.status_code == 403

    rv = client.post("/set-role", json={"role": "viewer", "username": "Visitante"})
    assert rv.status_code == 200
    assert rv.get_json()["role"] == "viewer"

    rv = client.post("/set-role", json={"role": "invalid"})
    assert rv.status_code == 400


def test_private_template_access(client):
    admin = client
    rv = admin.post("/api/templates", json={
        "name": "Privada",
        "template": "<h1>secret</h1>",
        "data": "{}",
        "visibility": "private",
    })
    assert rv.status_code == 201
    tid = rv.get_json()["id"]

    # Viewer cannot access private
    with app.test_client() as viewer:
        with viewer.session_transaction() as sess:
            sess["role"] = "viewer"
        rv = viewer.get(f"/api/templates/{tid}")
        assert rv.status_code == 403

    # Admin can
    rv = admin.get(f"/api/templates/{tid}")
    assert rv.status_code == 200

    admin.delete(f"/api/templates/{tid}")


def test_export_excel(client):
    rv = client.post("/export/excel", json={
        "data": json.dumps({
            "productos": [
                {"nombre": "Laptop", "precio": 3000},
                {"nombre": "Mouse", "precio": 50},
            ]
        }),
        "filename": "test",
    })
    assert rv.status_code == 200
    assert rv.mimetype == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
