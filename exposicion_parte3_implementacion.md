# DSL — Sistema de Reportes Dinámicos con Jinja2
## Parte 3: Implementación y Demostración

**CodeLAB: Proyecto colaborativo**

---

## Proyecto seleccionado: 3.b — Sistema de Reportes Dinámicos con Jinja2

**Descripción:** Generador de reportes empresariales donde las plantillas Jinja2 se combinan con datos JSON para crear documentos HTML personalizados con preview en tiempo real.

**Tecnologías:** Python, Flask, Jinja2, SQLite, openpyxl, HTML/CSS/JS vanilla, CodeMirror, Chart.js, html2pdf.js

---

## Características Implementadas

### Editor y Preview
- Editor de plantillas Jinja2 con **syntax highlighting** (CodeMirror, modo Django/Jinja2)
- Editor JSON con validación integrada
- **Preview en tiempo real** con debounce de 400 ms
- Reporte de errores de sintaxis Jinja2 con número de línea exacto
- Interfaz dark mode con panel split editor/preview

### Gestión de Plantillas
- **CRUD completo** de plantillas guardadas en SQLite (guardar, cargar, actualizar, eliminar)
- Versionado automático de plantillas (campo `version`)
- Visibilidad por plantilla: `public` (todos) o `private` (solo admin)

### Sistema de Roles y Permisos
- Roles `admin` / `viewer` por sesión Flask
- Variables `_role` y `_user` inyectadas automáticamente en cada renderizado
- Las plantillas privadas solo son accesibles para el rol `admin`

### Exportación
- Exportar reporte a **PDF** (html2pdf.js, formato A4)
- Exportar datos a **Excel** (.xlsx, openpyxl) — genera una hoja por cada lista de objetos en el JSON

### Gráficos (Chart.js)
- Filtro DSL `chart` para insertar gráficos de barras, líneas, pastel, etc.
- Los gráficos se inicializan automáticamente en el preview y se destruyen al re-renderizar

### Programación de Reportes
- Crear reportes programados con frecuencia `daily`, `weekly` o `monthly`
- Ejecutar un reporte manualmente desde la UI
- Pausar / reanudar programaciones
- Historial de ejecuciones por programación
- Polling automático cada 60 s para notificar reportes vencidos

---

## Filtros DSL Disponibles

| Filtro | Uso | Ejemplo | Resultado |
|--------|-----|---------|-----------|
| `currency` | Formato monetario | `{{ 1500 \| currency }}` | `S/ 1,500.00` |
| `upper_first` | Capitaliza primera letra | `{{ "laptop" \| upper_first }}` | `Laptop` |
| `badge` | Clase CSS según umbral | `{{ 85 \| badge }}` | `badge-success` |
| `percent` | Formato porcentaje | `{{ 23.5 \| percent }}` | `23.5%` |
| `tojson` | Serializa a JSON seguro | `{{ obj \| tojson }}` | `{"key": "val"}` |
| `chart` | Inserta gráfico Chart.js desde dict | `{{ cfg \| chart }}` | `<canvas ...>` |
| `upper` | Todo mayúsculas (Jinja2 nativo) | `{{ "hola" \| upper }}` | `HOLA` |
| `lower` | Todo minúsculas (Jinja2 nativo) | `{{ "HOLA" \| lower }}` | `hola` |
| `length` | Longitud de lista (Jinja2 nativo) | `{{ lista \| length }}` | `3` |
| `sum` | Suma de campo (Jinja2 nativo) | `{{ ventas \| sum(attribute='total') }}` | `17400` |

---

## Plantillas de Ejemplo Precargadas

| Clave | Nombre | Demuestra |
|---|---|---|
| `ventas` | Reporte de Ventas | Tabla con `for`, `upper_first`, `currency`, `sum` |
| `empleados` | Reporte de Empleados | Tarjetas con `badge`, `percent`, `length` |
| `ventas_chart` | Ventas con Gráfico | Gráfico de barras con filtro `chart` (Chart.js) |
| `permisos` | Reporte con Permisos | Secciones condicionales con `_role` (`admin`/`viewer`) |

---

## Ejemplo de Plantilla en Vivo

**Plantilla Jinja2:**

```jinja2
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

<p><strong>Total: {{ ventas | sum(attribute='total') | currency }}</strong></p>
```

**Datos JSON correspondientes:**

```json
{
  "titulo": "Reporte Mensual",
  "periodo": "Junio 2025",
  "ventas": [
    { "producto": "laptop", "cantidad": 5, "total": 15000 },
    { "producto": "mouse",  "cantidad": 20, "total": 600  },
    { "producto": "teclado","cantidad": 12, "total": 1800 }
  ]
}
```

---

## Instalación y Ejecución

```bash
# Clonar / descomprimir el proyecto
cd dsl-trabajo

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar
python app.py

# Abrir en el navegador
# http://localhost:5000
```

La base de datos SQLite se crea automáticamente en `reports/templates.db` al iniciar.

---

## Recomendaciones para la Presentación

- Documentar claramente por qué Jinja2 es un DSL frente a JS puro.
- Mostrar en vivo: plantilla → datos JSON → HTML renderizado.
- Comparativa: generar el mismo reporte con `innerHTML` en JS vs. plantilla Jinja2.
- Incluir métricas de legibilidad y mantenibilidad.

### Estructura de presentación sugerida

1. Problema identificado — reportes HTML generados con JS "espagueti"
2. Por qué Jinja2 (DSL) es la solución adecuada
3. Demostración en vivo del editor con preview
4. Comparativa: DSL vs. sin DSL
5. Lecciones aprendidas y mejores prácticas

---

## Referencia

- Wikipedia: DSL — https://en.wikipedia.org/wiki/Domain-specific_language
- Jinja2 Docs — https://jinja.palletsprojects.com
- Flask Docs — https://flask.palletsprojects.com
