from flask import Flask, render_template, request, jsonify
from jinja2 import Environment, BaseLoader, TemplateSyntaxError, UndefinedError
import json
import os
import sqlite3
from datetime import datetime

app = Flask(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "reports", "templates.db")

# ── SQLite init ──────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS saved_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            template TEXT NOT NULL,
            data TEXT NOT NULL DEFAULT '{}',
            version INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

# Jinja2 environment aislado para renderizar plantillas del usuario
user_env = Environment(loader=BaseLoader())

# Filtros personalizados (custom DSL filters)
def currency_filter(value, symbol="S/"):
    try:
        return f"{symbol} {float(value):,.2f}"
    except (ValueError, TypeError):
        return value

def upper_first(value):
    return str(value).capitalize()

def badge(value, thresholds=None):
    if thresholds is None:
        thresholds = {"danger": 30, "warning": 70}
    try:
        v = float(value)
        if v < thresholds["danger"]:
            return "badge-danger"
        elif v < thresholds["warning"]:
            return "badge-warning"
        return "badge-success"
    except (ValueError, TypeError):
        return "badge-default"

user_env.filters["currency"] = currency_filter
user_env.filters["upper_first"] = upper_first
user_env.filters["badge"] = badge

# Plantillas de ejemplo incluidas en el sistema
EXAMPLE_TEMPLATES = {
    "ventas": {
        "name": "Reporte de Ventas",
        "template": """\
<h1>{{ titulo }}</h1>
<p>Periodo: {{ periodo }}</p>
<table>
  <thead>
    <tr><th>Producto</th><th>Cantidad</th><th>Total</th></tr>
  </thead>
  <tbody>
    {% for item in ventas %}
    <tr>
      <td>{{ item.producto | upper_first }}</td>
      <td>{{ item.cantidad }}</td>
      <td>{{ item.total | currency }}</td>
    </tr>
    {% endfor %}
  </tbody>
</table>
<p><strong>Total general: {{ ventas | sum(attribute='total') | currency }}</strong></p>
""",
        "data": json.dumps({
            "titulo": "Reporte Mensual",
            "periodo": "Junio 2025",
            "ventas": [
                {"producto": "laptop", "cantidad": 5, "total": 15000},
                {"producto": "mouse", "cantidad": 20, "total": 600},
                {"producto": "teclado", "cantidad": 12, "total": 1800}
            ]
        }, indent=2)
    },
    "empleados": {
        "name": "Reporte de Empleados",
        "template": """\
<h1>{{ empresa }}</h1>
<h2>Personal Activo</h2>
{% for emp in empleados %}
<div class="card">
  <strong>{{ emp.nombre }}</strong> — {{ emp.cargo }}
  <span class="{{ emp.rendimiento | badge }}">{{ emp.rendimiento }}%</span>
</div>
{% endfor %}
<p>Total empleados: {{ empleados | length }}</p>
""",
        "data": json.dumps({
            "empresa": "Soluciones Técnicas Andinas S.A.C.",
            "empleados": [
                {"nombre": "Ana Torres", "cargo": "Desarrolladora", "rendimiento": 92},
                {"nombre": "Luis Quispe", "cargo": "Diseñador", "rendimiento": 65},
                {"nombre": "María Chávez", "cargo": "QA", "rendimiento": 25}
            ]
        }, indent=2)
    }
}


@app.route("/")
def index():
    return render_template("index.html", examples=EXAMPLE_TEMPLATES)


@app.route("/preview", methods=["POST"])
def preview():
    body = request.get_json()
    template_src = body.get("template", "")
    data_src = body.get("data", "{}")

    try:
        context = json.loads(data_src)
    except json.JSONDecodeError as e:
        return jsonify({"error": f"JSON inválido: {e}"}), 400

    try:
        tmpl = user_env.from_string(template_src)
        rendered = tmpl.render(**context)
        return jsonify({"html": rendered})
    except TemplateSyntaxError as e:
        return jsonify({"error": f"Error de sintaxis Jinja2 (línea {e.lineno}): {e.message}"}), 400
    except UndefinedError as e:
        return jsonify({"error": f"Variable no definida: {e}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/examples/<key>")
def get_example(key):
    ex = EXAMPLE_TEMPLATES.get(key)
    if not ex:
        return jsonify({"error": "Ejemplo no encontrado"}), 404
    return jsonify(ex)


# ── API: CRUD de plantillas guardadas ────────────────────────────────────────

@app.route("/api/templates", methods=["GET"])
def list_templates():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, name, version, updated_at FROM saved_templates ORDER BY updated_at DESC"
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/templates", methods=["POST"])
def save_template():
    body = request.get_json()
    name = body.get("name", "").strip()
    if not name:
        return jsonify({"error": "El nombre es obligatorio"}), 400

    conn = get_db()
    cur = conn.execute(
        "INSERT INTO saved_templates (name, template, data) VALUES (?, ?, ?)",
        (name, body.get("template", ""), body.get("data", "{}")),
    )
    conn.commit()
    row = conn.execute(
        "SELECT id, name, version, updated_at FROM saved_templates WHERE id = ?",
        (cur.lastrowid,),
    ).fetchone()
    conn.close()
    return jsonify(dict(row)), 201


@app.route("/api/templates/<int:tid>", methods=["GET"])
def get_template(tid):
    conn = get_db()
    row = conn.execute("SELECT * FROM saved_templates WHERE id = ?", (tid,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Plantilla no encontrada"}), 404
    return jsonify(dict(row))


@app.route("/api/templates/<int:tid>", methods=["PUT"])
def update_template(tid):
    conn = get_db()
    existing = conn.execute("SELECT * FROM saved_templates WHERE id = ?", (tid,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({"error": "Plantilla no encontrada"}), 404

    body = request.get_json()
    name = body.get("name", existing["name"]).strip()
    if not name:
        return jsonify({"error": "El nombre es obligatorio"}), 400

    conn.execute(
        """UPDATE saved_templates
           SET name = ?, template = ?, data = ?, version = version + 1, updated_at = ?
           WHERE id = ?""",
        (name, body.get("template", existing["template"]),
         body.get("data", existing["data"]), datetime.utcnow().isoformat(), tid),
    )
    conn.commit()
    row = conn.execute(
        "SELECT id, name, version, updated_at FROM saved_templates WHERE id = ?", (tid,)
    ).fetchone()
    conn.close()
    return jsonify(dict(row))


@app.route("/api/templates/<int:tid>", methods=["DELETE"])
def delete_template(tid):
    conn = get_db()
    cur = conn.execute("DELETE FROM saved_templates WHERE id = ?", (tid,))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        return jsonify({"error": "Plantilla no encontrada"}), 404
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
