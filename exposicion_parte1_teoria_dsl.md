# DSL — Sistema de Reportes Dinámicos con Jinja2
## Parte 1: Teoría y Fundamentos DSL

**CodeLAB: Proyecto colaborativo**

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
- **Filtros:** `valor | filtro` — transformaciones del dominio (`currency`, `badge`, `chart`, etc.).
- **Macros:** `{% macro nombre(args) %}` — reutilización de fragmentos de plantilla.
- **Herencia:** `{% extends %}` / `{% block %}` — composición jerárquica de layouts.

### Dos tipos de DSL

- **Textuales:** más expresivos, basados en gramática. → *Jinja2 es un DSL textual.*
- **Visuales:** más fáciles de interpretar, basados en mapping gráfico.

### Comparativa: DSL (Jinja2) vs. sin DSL (JavaScript puro)

| Aspecto | JS puro (`innerHTML`) | Jinja2 (DSL) |
|---|---|---|
| Legibilidad | Baja — HTML mezclado con lógica JS | Alta — plantilla limpia y separada |
| Mantenibilidad | Difícil — cambios rompen lógica | Fácil — plantilla independiente del backend |
| Reutilización | Manual — copiar y pegar | Macros y herencia de plantillas |
| Separación de roles | Ninguna — developer hace todo | Diseñador maneja plantilla, dev maneja datos |
| Detección de errores | En tiempo de ejecución JS | Jinja2 reporta línea exacta del error |

---

## Referencia

- Wikipedia: DSL — https://en.wikipedia.org/wiki/Domain-specific_language
- Jinja2 Docs — https://jinja.palletsprojects.com
- Flask Docs — https://flask.palletsprojects.com
