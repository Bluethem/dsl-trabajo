# DSL — Sistema de Reportes Dinámicos con Jinja2
## Parte 2: Requerimientos y Diseño del Sistema

**CodeLAB: Proyecto colaborativo**

---

## 1.a. Enunciado de Caso de Uso (Use Case Specification)

**Nombre del Caso de Uso:** Generar Reporte Dinámico desde Plantilla Jinja2
**ID:** UC-001
**Actor Principal:** Usuario del sistema (analista / generador de reportes)

**Precondiciones:**
- El usuario tiene acceso a la interfaz web del sistema.
- El usuario dispone de una plantilla Jinja2 válida y un conjunto de datos en formato JSON.

**Postcondiciones:**
- El sistema renderiza el HTML resultante y lo muestra en el panel de preview en tiempo real.
- Los errores de sintaxis Jinja2 o de JSON inválido son reportados al usuario con detalle de línea.

---

## 1.b. User Story (Historia de Usuario)

**Título:** Editor de plantillas con preview en tiempo real

> **AS a:** analista que genera reportes empresariales recurrentes,
> **I want:** escribir plantillas Jinja2 y datos JSON en un editor web y ver el resultado renderizado al instante,
> **So that:** pueda crear y ajustar reportes dinámicos sin necesidad de recargar la página ni configurar un entorno local.

**Criterios de Aceptación:**
- El preview se actualiza automáticamente 400 ms después del último cambio en el editor (debounce).
- Los errores de sintaxis Jinja2 muestran el número de línea afectado.
- Los filtros personalizados (`currency`, `upper_first`, `badge`) están disponibles en todas las plantillas.

---

## 2. Criterios de Diseño

### 2.a. Arquitectura WEB

- **Monolito Flask:** frontend (HTML/CSS/JS estático) y backend (API de renderizado) servidos desde la misma aplicación Python.
- **Separación de entornos Jinja2:** el `Environment` del usuario está aislado del `Environment` interno de Flask para evitar colisiones y riesgos de seguridad.

---

## Estructura del Proyecto

```
dsl-trabajo/
├── app.py                          # Backend Flask + lógica de renderizado Jinja2
├── requirements.txt                # Dependencias Python
├── templates/
│   ├── base.html                   # Layout base Flask
│   └── index.html                  # Página principal con el editor
├── static/
│   ├── css/
│   │   └── style.css               # Estilos del editor (dark mode)
│   ├── js/
│   │   └── editor.js               # Lógica de preview, exportación y programación
│   └── vendor/
│       ├── codemirror/             # Editor con syntax highlighting
│       └── html2pdf/               # Exportación a PDF
└── reports/
    └── templates.db                # Base de datos SQLite (se crea automáticamente)
```

---

## Arquitectura: Flujo de Datos

```
Usuario escribe plantilla + JSON
        │
        ▼ (debounce 400ms)
   editor.js → POST /preview
        │
        ▼
   app.py: json.loads(data)
           + contexto _role / _user
           → user_env.from_string(template).render(**context)
        │
        ├─ OK  → { "html": "<h1>...</h1>" }  → previewFrame.innerHTML → initCharts()
        └─ ERR → { "error": "línea X: ..." } → errorBox
```

---

## Base de Datos (SQLite — modo WAL)

La base de datos se crea automáticamente en `reports/templates.db` al iniciar la aplicación.

### Tabla `saved_templates`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Identificador |
| `name` | TEXT | Nombre de la plantilla |
| `template` | TEXT | Código Jinja2 |
| `data` | TEXT | Datos JSON por defecto |
| `version` | INTEGER | Incrementa en cada actualización |
| `visibility` | TEXT | `public` o `private` |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Última actualización |

### Tabla `scheduled_reports`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Identificador |
| `name` | TEXT | Nombre del reporte |
| `template_id` | INTEGER | Referencia a plantilla guardada |
| `frequency` | TEXT | `daily`, `weekly` o `monthly` |
| `active` | INTEGER | 1 = activo, 0 = pausado |
| `last_run` | TIMESTAMP | Última ejecución |
| `next_run` | TIMESTAMP | Próxima ejecución programada |

### Tabla `report_runs`
Historial de ejecuciones de cada programación (últimas 20 por schedule).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Identificador |
| `schedule_id` | INTEGER | Referencia a `scheduled_reports` |
| `schedule_name` | TEXT | Nombre al momento de ejecutar |
| `status` | TEXT | Estado de la ejecución (`ok`) |
| `ran_at` | TIMESTAMP | Fecha y hora de ejecución |

---

## API REST

### Renderizado
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/preview` | Renderiza plantilla Jinja2 con datos JSON |
| `GET` | `/examples/<key>` | Devuelve plantilla y datos de un ejemplo precargado |

### Plantillas guardadas
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/templates` | Lista plantillas (filtra privadas según rol) |
| `POST` | `/api/templates` | Guarda nueva plantilla |
| `GET` | `/api/templates/<id>` | Carga una plantilla |
| `PUT` | `/api/templates/<id>` | Actualiza plantilla (incrementa versión) |
| `DELETE` | `/api/templates/<id>` | Elimina plantilla |

### Programación de reportes
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/schedules` | Lista programaciones |
| `POST` | `/api/schedules` | Crea programación |
| `DELETE` | `/api/schedules/<id>` | Elimina programación |
| `POST` | `/api/schedules/<id>/toggle` | Pausa o activa |
| `POST` | `/api/schedules/<id>/run` | Ejecuta manualmente |
| `GET` | `/api/schedules/<id>/runs` | Historial de ejecuciones |
| `GET` | `/api/schedules/due` | Lista programaciones vencidas |

### Exportación y Sesión
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/export/excel` | Genera archivo `.xlsx` desde datos JSON |
| `POST` | `/set-role` | Establece rol y usuario de la sesión (`admin`/`viewer`) |

---

## Referencia

- Wikipedia: DSL — https://en.wikipedia.org/wiki/Domain-specific_language
- Jinja2 Docs — https://jinja.palletsprojects.com
- Flask Docs — https://flask.palletsprojects.com
