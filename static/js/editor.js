// ===== DSL Reportes — Editor JS (CodeMirror) =====

function escHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const previewFrame = document.getElementById("preview-frame");
const errorBox = document.getElementById("error-box");
const renderTime = document.getElementById("render-time");
const statusMsg = document.getElementById("status-msg");

let debounceTimer = null;

function makeEditor(textareaId, mode) {
  const ta = document.getElementById(textareaId);
  const editor = CodeMirror.fromTextArea(ta, {
    mode: mode,
    lineNumbers: true,
    matchBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: true,
    styleActiveLine: true,
    viewportMargin: Infinity,
    extraKeys: {
      "Tab": function(cm) { cm.replaceSelection("  "); }
    }
  });
  editor.on("change", scheduleRender);
  return editor;
}

const templateEditor = makeEditor("template-editor", "django");
const dataEditor = makeEditor("data-editor", { name: "javascript", json: true });

// ── Preview en tiempo real ──────────────────────────────────────────────────

async function renderPreview() {
  const template = templateEditor.getValue().trim();
  const data = dataEditor.getValue().trim();

  if (!template) {
    previewFrame.innerHTML = `<div class="preview-placeholder">
      <p>👈 Escribe una plantilla y datos para ver el preview aquí.</p>
    </div>`;
    hideError();
    renderTime.textContent = "";
    return;
  }

  const t0 = performance.now();

  try {
    const res = await fetch("/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template, data: data || "{}" }),
    });

    const result = await res.json();
    const elapsed = (performance.now() - t0).toFixed(1);

    if (result.error) {
      showError(result.error);
      renderTime.textContent = "";
    } else {
      hideError();
      previewFrame.innerHTML = result.html;
      renderTime.textContent = `${elapsed}ms`;
      statusMsg.textContent = "✓ Renderizado";
      statusMsg.style.color = "var(--success)";
      setTimeout(() => { statusMsg.textContent = ""; }, 1500);
    }
  } catch (err) {
    showError("Error de conexión con el servidor");
  }
}

function showError(msg) {
  errorBox.textContent = "⚠ " + msg;
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.classList.add("hidden");
}

// ── Debounce: dispara preview 400ms después del último cambio ───────────────

function scheduleRender() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(renderPreview, 400);
}

// ── Ejemplos ────────────────────────────────────────────────────────────────

document.querySelectorAll(".btn-example").forEach(btn => {
  btn.addEventListener("click", async () => {
    const key = btn.dataset.key;
    const res = await fetch(`/examples/${key}`);
    const ex = await res.json();
    templateEditor.setValue(ex.template);
    dataEditor.setValue(ex.data);
    renderPreview();
  });
});

// ── Limpiar ─────────────────────────────────────────────────────────────────

document.getElementById("btn-clear").addEventListener("click", () => {
  templateEditor.setValue("");
  dataEditor.setValue("");
  previewFrame.innerHTML = `<div class="preview-placeholder">
    <p>👈 Escribe una plantilla y datos para ver el preview aquí.</p>
    <p>El preview se actualiza automáticamente.</p>
  </div>`;
  hideError();
  renderTime.textContent = "";
});

// ── Guardar plantilla ───────────────────────────────────────────────────────

document.getElementById("btn-save").addEventListener("click", async () => {
  const template = templateEditor.getValue().trim();
  const data = dataEditor.getValue().trim();
  if (!template) {
    statusMsg.textContent = "⚠ Escribe una plantilla antes de guardar";
    statusMsg.style.color = "var(--warning)";
    setTimeout(() => { statusMsg.textContent = ""; }, 2000);
    return;
  }

  const name = prompt("Nombre de la plantilla:");
  if (!name || !name.trim()) return;

  try {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), template, data: data || "{}" }),
    });
    if (res.ok) {
      statusMsg.textContent = "✓ Guardada";
      statusMsg.style.color = "var(--success)";
      setTimeout(() => { statusMsg.textContent = ""; }, 1500);
      loadTemplatesList();
    } else {
      const err = await res.json();
      statusMsg.textContent = "✗ " + err.error;
      statusMsg.style.color = "var(--error)";
      setTimeout(() => { statusMsg.textContent = ""; }, 2500);
    }
  } catch {
    statusMsg.textContent = "✗ Error de conexión";
    statusMsg.style.color = "var(--error)";
    setTimeout(() => { statusMsg.textContent = ""; }, 2000);
  }
});

// ── Listar plantillas guardadas ─────────────────────────────────────────────

const templatesMenu = document.getElementById("templates-menu");

let currentTemplateId = null;

async function loadTemplatesList() {
  try {
    const res = await fetch("/api/templates");
    const list = await res.json();
    renderTemplatesList(list);
  } catch {
    templatesMenu.innerHTML = `<div class="dropdown-empty">Error al cargar</div>`;
  }
}

function renderTemplatesList(list) {
  if (!list.length) {
    templatesMenu.innerHTML = `<div class="dropdown-empty">No hay plantillas guardadas</div>`;
    return;
  }
  templatesMenu.innerHTML = list.map(t => {
    const date = t.updated_at ? new Date(t.updated_at).toLocaleDateString() : "";
    const active = t.id === currentTemplateId ? ' style="background:var(--bg3)"' : "";
    return `<div class="dropdown-item" data-id="${t.id}"${active}>
      <span class="item-name">${escHtml(t.name)}</span>
      <span class="item-meta">v${t.version} ${date}</span>
      <button class="item-delete" data-id="${t.id}" title="Eliminar">✕</button>
    </div>`;
  }).join("");

  templatesMenu.querySelectorAll(".dropdown-item").forEach(item => {
    item.addEventListener("click", async (e) => {
      if (e.target.closest(".item-delete")) return;
      const tid = parseInt(item.dataset.id);
      await loadTemplate(tid);
      closeDropdown();
    });
  });

  templatesMenu.querySelectorAll(".item-delete").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const tid = parseInt(btn.dataset.id);
      if (confirm("¿Eliminar esta plantilla?")) {
        await deleteTemplate(tid);
        if (currentTemplateId === tid) currentTemplateId = null;
        loadTemplatesList();
      }
    });
  });
}

async function loadTemplate(tid) {
  try {
    const res = await fetch(`/api/templates/${tid}`);
    if (!res.ok) return;
    const t = await res.json();
    templateEditor.setValue(t.template);
    dataEditor.setValue(t.data);
    currentTemplateId = tid;
    renderPreview();
    statusMsg.textContent = `✓ Cargado: ${t.name}`;
    statusMsg.style.color = "var(--success)";
    setTimeout(() => { statusMsg.textContent = ""; }, 1500);
  } catch {
    statusMsg.textContent = "✗ Error al cargar";
    statusMsg.style.color = "var(--error)";
    setTimeout(() => { statusMsg.textContent = ""; }, 2000);
  }
}

async function deleteTemplate(tid) {
  try {
    await fetch(`/api/templates/${tid}`, { method: "DELETE" });
  } catch {}
}

// ── Dropdown toggle ─────────────────────────────────────────────────────────

function closeDropdown() {
  document.getElementById("templates-menu").classList.remove("open");
}

document.getElementById("btn-templates").addEventListener("click", (e) => {
  e.stopPropagation();
  const menu = document.getElementById("templates-menu");
  const isOpen = menu.classList.contains("open");
  menu.classList.toggle("open");
  if (!isOpen) loadTemplatesList();
});

document.addEventListener("click", (e) => {
  const dd = document.getElementById("templates-dropdown");
  if (!dd.contains(e.target)) closeDropdown();
});

// ── Exportar PDF ────────────────────────────────────────────────────────────

document.getElementById("btn-pdf").addEventListener("click", () => {
  const content = document.getElementById("preview-frame");
  const hasContent = content.querySelector("h1, h2, table, p, .card");
  if (!hasContent) {
    statusMsg.textContent = "⚠ Genera un preview antes de exportar";
    statusMsg.style.color = "var(--warning)";
    setTimeout(() => { statusMsg.textContent = ""; }, 2000);
    return;
  }

  const opt = {
    margin:       [10, 10],
    filename:     "reporte.pdf",
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { format: "a4", orientation: "portrait" }
  };

  statusMsg.textContent = "⏳ Generando PDF...";
  statusMsg.style.color = "var(--text-muted)";

  html2pdf().set(opt).from(content).save().then(() => {
    statusMsg.textContent = "✓ PDF generado";
    statusMsg.style.color = "var(--success)";
    setTimeout(() => { statusMsg.textContent = ""; }, 1500);
  }).catch(() => {
    statusMsg.textContent = "✗ Error al generar PDF";
    statusMsg.style.color = "var(--error)";
    setTimeout(() => { statusMsg.textContent = ""; }, 2000);
  });
});
