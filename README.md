# Especificación: DSL — Sistema de Reportes Dinámicos con Jinja2

## Análisis, Diseño e Implementación

**CodeLAB: Proyecto colaborativo**
**DSL / Motor de plantillas Jinja2 para generar HTML dinámico**

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

## Tecnología WEB & "Domain-Specific Languages" (DSLs)

### Problemática

**Tecnología Web.** En una estructura de archivos de un sitio WEB: ¿cuál de las tecnologías que convergen en los Websites se considera formalmente un DSL?

En la estructura de archivos que incluyen HTML, CSS, JavaScript y JSON, ninguno de ellos se considera formalmente un DSL (Domain-Specific Language) en el sentido estricto de la informática.

#### a. Análisis por archivo — `index.html`
**HTML5 (HyperText Markup Language)**
**No es un DSL.**
Aunque se usa para un dominio específico (documentos web), el consenso técnico actual es que HTML es un Lenguaje de Marcación (Markup Language). No tiene lógica de control (if/else), variables ni funciones. Es un DSL declarativo en un sentido muy amplio, pero técnicamente se clasifica como lenguaje de marcado.

#### b. Análisis por archivo — `styles.css`
**CSS (Cascading Style Sheets)**
**No es un DSL.**
CSS es un Lenguaje de Hoja de Estilos. Es declarativo y específico del dominio de la presentación visual. Sin embargo, no tiene capacidad de programación (no puedes hacer bucles ni lógica compleja nativamente). Se considera un DSL declarativo para el dominio de estilos, pero no un lenguaje de programación.

#### c. Análisis por archivo — `script.js`
**JavaScript**
**No es un DSL.**
JavaScript es un Lenguaje de Propósito General (GPL). Es Turing-completo y puede usarse para casi cualquier tarea (web, servidores, móviles, juegos). No está restringido a un dominio específico.

#### d. Análisis por archivo — `datos.json`
**JSON (JavaScript Object Notation)**
**No es un DSL.**
JSON es un formato de intercambio de datos, no un lenguaje de programación. No tiene sintaxis de control, lógica ni comandos. Es un formato de datos estructurado (Data Interchange Format).

---

## Domain-Specific Languages (DSL)

### ¿Por qué no son DSLs formales?

Un DSL (Domain-Specific Language) formalmente es un lenguaje de programación diseñado para resolver problemas en un dominio específico, permitiendo expresar soluciones en ese dominio de manera más natural y concisa que un lenguaje de propósito general.

**Características clave que definen un DSL:**

- **Dominio Específico:** Resuelve problemas de un área concreta (ej. SQL para bases de datos).
- **Capacidad de Expresión:** Permite definir lógica, reglas, transformaciones o comportamientos dentro de ese dominio.
- **Abstracción:** Oculta los detalles complejos de la implementación subyacente.

**En el entorno de la tecnología WEB:**

HTML/CSS son lenguajes de marcado y estilos, respectivamente. Son declarativos y específicos del dominio web, pero carecen de capacidad de programación lógica. A menudo se les llama "pseudo-DSLs" o "lenguajes de descripción", pero no DSLs de programación.

**Ejemplos reales de DSLs embebidos en tecnología Web:**

- **SQL:** Para hacer query a bases de datos (DSL para datos relacionales).
- **Verilog/VHDL:** Para diseñar circuitos electrónicos (DSL para hardware).
- **LaTeX:** Para componer documentos científicos con fórmulas matemáticas.
- **Gradle/Maven:** Para definir la construcción de software.
- **Regular Expressions (Regex):** Para buscar patrones en texto.

**Conclusión:** Si quisieras implementar un DSL en un contexto web, tendrías que crear un lenguaje nuevo o usar uno existente, por ejemplo:

- Usar **SQL** dentro de `script.js` para hacer queries a una base de datos.
- Usar **Sass/SCSS** (preprocesador CSS que es un DSL sobre CSS) en lugar de CSS puro.
- Usar **Jinja2 o Handlebars** (plantillas que son DSLs para generar HTML dinámico) en lugar de inyectar HTML directamente con JS.

---

## Proyectos Colaborativos (Tres participantes)

### Proyecto seleccionado: 3.b — Sistema de Reportes Dinámicos con Jinja2

**Descripción:** Generador de reportes empresariales donde las plantillas Jinja2 se combinan con datos JSON para crear documentos HTML personalizados con preview en tiempo real.

**Características implementadas:**
- Editor de plantillas Jinja2 con preview en tiempo real (debounce 400 ms)
- Sistema de filtros personalizados Jinja2 (`currency`, `upper_first`, `badge`)
- Ejemplos precargados de reportes (ventas, empleados)
- Reporte de errores de sintaxis Jinja2 con número de línea
- Interfaz dark mode con panel split editor/preview

**Tecnologías:** Python, Flask, Jinja2, HTML/CSS/JS vanilla

---

## Estructura del Proyecto

```
dsl-reportes/
├── app.py                  # Backend Flask + lógica de renderizado Jinja2
├── requirements.txt        # Dependencias Python
├── templates/
│   ├── base.html           # Layout base Flask
│   └── index.html          # Página principal con el editor
├── static/
│   ├── css/
│   │   └── style.css       # Estilos del editor (dark mode)
│   └── js/
│       └── editor.js       # Lógica de preview en tiempo real
└── reports/                # Directorio para reportes guardados (futuro)
```

---

## Instalación y Ejecución

```bash
# Clonar / descomprimir el proyecto
cd dsl-reportes

# Instalar dependencias
pip install flask jinja2

# Ejecutar
python app.py

# Abrir en el navegador
# http://localhost:5000
```

---

## Filtros DSL Disponibles

| Filtro | Uso | Ejemplo | Resultado |
|--------|-----|---------|-----------|
| `currency` | Formato monetario | `{{ 1500 \| currency }}` | `S/ 1,500.00` |
| `upper_first` | Capitaliza primera letra | `{{ "laptop" \| upper_first }}` | `Laptop` |
| `badge` | Clase CSS según umbral | `{{ 85 \| badge }}` | `badge-success` |
| `upper` | Todo mayúsculas (Jinja2) | `{{ "hola" \| upper }}` | `HOLA` |
| `lower` | Todo minúsculas (Jinja2) | `{{ "HOLA" \| lower }}` | `hola` |
| `length` | Longitud de lista (Jinja2) | `{{ lista \| length }}` | `3` |
| `sum` | Suma de campo (Jinja2) | `{{ ventas \| sum(attribute='total') }}` | `17400` |

---

## Ejemplo de Plantilla

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

## Arquitectura: Flujo de Datos

```
Usuario escribe plantilla + JSON
        │
        ▼ (debounce 400ms)
   editor.js → POST /preview
        │
        ▼
   app.py: json.loads(data) → user_env.from_string(template).render(**context)
        │
        ├─ OK  → { "html": "<h1>...</h1>" }  → previewFrame.innerHTML
        └─ ERR → { "error": "línea X: ..." } → errorBox
```

---

## Bases Teóricas: DSLs

### Justificación de Jinja2 como DSL

Jinja2 cumple con las características formales de un DSL:

- **Dominio Específico:** Generación de documentos de texto con estructura (HTML, XML, Markdown).
- **Capacidad de Expresión:** Soporta variables (`{{ }}`), estructuras de control (`{% %}`), filtros y macros reutilizables.
- **Abstracción:** El diseñador de plantillas no necesita conocer Python; trabaja en el dominio del documento.

### Metamodelo del DSL (Jinja2)

El metamodelo de Jinja2 se compone de:

- **Variables:** `{{ expresion }}` — interpolación de datos del contexto.
- **Bloques de control:** `{% if %} {% for %} {% block %}` — lógica de presentación.
- **Filtros:** `valor | filtro` — transformaciones del dominio (currency, badge, etc.).
- **Macros:** `{% macro nombre(args) %}` — reutilización de fragmentos de plantilla.
- **Herencia:** `{% extends %}` / `{% block %}` — composición jerárquica de layouts.

### Dos tipos de DSL

- **Textuales:** más expresivos, basados en gramática. → *Jinja2 es un DSL textual.*
- **Visuales:** más fáciles de interpretar, basados en mapping gráfico.

---

## Próximos Pasos

- [ ] Persistencia de plantillas con SQLite (guardar/cargar/versionar)
- [ ] Exportación a PDF con WeasyPrint
- [ ] Syntax highlighting en el editor con CodeMirror
- [ ] Programación de reportes periódicos

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
