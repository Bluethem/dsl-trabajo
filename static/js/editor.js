// ===== DSL Reportes — Editor JS =====

function escHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const previewFrame = document.getElementById("preview-frame");
const errorBox     = document.getElementById("error-box");
const renderTime   = document.getElementById("render-time");
const statusMsg    = document.getElementById("status-msg");

let debounceTimer = null;
// Tracks Chart.js instances so we can destroy them before re-rendering
const chartInstances = [];

// ── CodeMirror editors ───────────────────────────────────────────────────────

function makeEditor(textareaId, mode) {
  const ta = document.getElementById(textareaId);
  const editor = CodeMirror.fromTextArea(ta, {
    mode,
    lineNumbers: true,
    matchBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: true,
    styleActiveLine: true,
    viewportMargin: 30,
    extraKeys: { "Tab": (cm) => cm.replaceSelection("  ") }
  });
  editor.setSize("100%", "100%");
  editor.on("change", scheduleRender);
  return editor;
}

const templateEditor = makeEditor("template-editor", "django");
const dataEditor     = makeEditor("data-editor", { name: "javascript", json: true });

function refreshEditors() {
  [templateEditor, dataEditor].forEach(editor => {
    editor.setSize("100%", "100%");
    editor.refresh();
  });
}

window.addEventListener("resize", refreshEditors);
setTimeout(refreshEditors, 0);

// ── Chart.js initialization ──────────────────────────────────────────────────

function destroyCharts() {
  chartInstances.forEach(c => c.destroy());
  chartInstances.length = 0;
}

function initCharts() {
  previewFrame.querySelectorAll("canvas.dsl-chart").forEach(canvas => {
    const raw = canvas.getAttribute("data-chart");
    if (!raw) return;
    try {
      const cfg = JSON.parse(raw);
      const datasets = cfg.datasets || [{
        label: cfg.label || "Datos",
        data:  cfg.data  || [],
        backgroundColor: cfg.backgroundColor || "#7c6af7",
        borderColor:     cfg.borderColor     || "#7c6af7",
        borderWidth: 1,
        borderRadius: 4,
      }];
      // Fill default colors for each dataset if needed
      datasets.forEach(ds => {
        if (!ds.backgroundColor) ds.backgroundColor = "#7c6af7";
        if (!ds.borderColor)     ds.borderColor = "#7c6af7";
      });
      const instance = new Chart(canvas, {
        type: cfg.type || "bar",
        data: { labels: cfg.labels || [], datasets },
        options: {
          responsive: true,
          plugins: {
            legend: { position: "top" },
            title: {
              display: !!cfg.title,
              text: cfg.title || "",
              font: { size: 14 }
            }
          },
          scales: (cfg.type === "pie" || cfg.type === "doughnut")
            ? {}
            : { y: { beginAtZero: true } }
        }
      });
      chartInstances.push(instance);
    } catch (e) {
      console.warn("dsl-chart parse error:", e);
    }
  });
}

// ── Preview en tiempo real ───────────────────────────────────────────────────

async function renderPreview() {
  const template = templateEditor.getValue().trim();
  const data     = dataEditor.getValue().trim();

  if (!template) {
    destroyCharts();
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
      destroyCharts();
      previewFrame.innerHTML = result.html;
      initCharts();
      renderTime.textContent = `${elapsed}ms`;
      setStatus("✓ Renderizado", "success", 1500);
    }
  } catch {
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

function scheduleRender() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(renderPreview, 400);
}

// ── Status helper ────────────────────────────────────────────────────────────

function setStatus(msg, type = "muted", clearAfter = 0) {
  const colors = { success: "var(--success)", error: "var(--error)", warning: "var(--warning)", muted: "var(--text-muted)" };
  statusMsg.textContent = msg;
  statusMsg.style.color = colors[type] || colors.muted;
  if (clearAfter) setTimeout(() => { statusMsg.textContent = ""; }, clearAfter);
}

// ── Toast ────────────────────────────────────────────────────────────────────

function showToast(msg, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast toast-${type}`;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3500);
}

// ── Ejemplos ─────────────────────────────────────────────────────────────────

document.querySelectorAll(".btn-example").forEach(btn => {
  btn.addEventListener("click", async () => {
    const key = btn.dataset.key;
    const res = await fetch(`/examples/${key}`);
    const ex  = await res.json();
    templateEditor.setValue(ex.template);
    dataEditor.setValue(ex.data);
    refreshEditors();
    renderPreview();
  });
});

// ── Limpiar ───────────────────────────────────────────────────────────────────

document.getElementById("btn-clear").addEventListener("click", () => {
  templateEditor.setValue("");
  dataEditor.setValue("");
  refreshEditors();
  destroyCharts();
  previewFrame.innerHTML = `<div class="preview-placeholder">
    <p>👈 Escribe una plantilla y datos para ver el preview aquí.</p>
    <p>El preview se actualiza automáticamente.</p>
  </div>`;
  hideError();
  renderTime.textContent = "";
  currentTemplateId = null;
});

// ── Guardar plantilla ────────────────────────────────────────────────────────

let currentTemplateId = null;

document.getElementById("btn-save").addEventListener("click", async () => {
  const template   = templateEditor.getValue().trim();
  const data       = dataEditor.getValue().trim();
  const visibility = document.getElementById("visibility-select").value;

  if (!template) {
    setStatus("⚠ Escribe una plantilla antes de guardar", "warning", 2000);
    return;
  }

  const name = prompt("Nombre de la plantilla:");
  if (!name || !name.trim()) return;

  try {
    let res, method, url;
    if (currentTemplateId) {
      method = "PUT";
      url    = `/api/templates/${currentTemplateId}`;
    } else {
      method = "POST";
      url    = "/api/templates";
    }

    res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), template, data: data || "{}", visibility }),
    });

    if (res.ok) {
      const saved = await res.json();
      currentTemplateId = saved.id;
      setStatus(`✓ Guardada (v${saved.version})`, "success", 2000);
      loadTemplatesList();
    } else {
      const err = await res.json();
      setStatus("✗ " + err.error, "error", 2500);
    }
  } catch {
    setStatus("✗ Error de conexión", "error", 2000);
  }
});

// ── Listar plantillas guardadas ───────────────────────────────────────────────

const templatesMenu = document.getElementById("templates-menu");

async function loadTemplatesList() {
  try {
    const res  = await fetch("/api/templates");
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
    const date   = t.updated_at ? new Date(t.updated_at).toLocaleDateString() : "";
    const active = t.id === currentTemplateId ? ' style="background:var(--bg3)"' : "";
    const lock   = t.visibility === "private" ? " 🔒" : "";
    return `<div class="dropdown-item" data-id="${t.id}"${active}>
      <span class="item-name">${escHtml(t.name)}${lock}</span>
      <span class="item-meta">v${t.version} ${date}</span>
      <button class="item-delete" data-id="${t.id}" title="Eliminar">✕</button>
    </div>`;
  }).join("");

  templatesMenu.querySelectorAll(".dropdown-item").forEach(item => {
    item.addEventListener("click", async (e) => {
      if (e.target.closest(".item-delete")) return;
      await loadTemplate(parseInt(item.dataset.id));
      closeDropdown();
    });
  });

  templatesMenu.querySelectorAll(".item-delete").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const tid = parseInt(btn.dataset.id);
      if (confirm("¿Eliminar esta plantilla?")) {
        await fetch(`/api/templates/${tid}`, { method: "DELETE" });
        if (currentTemplateId === tid) currentTemplateId = null;
        loadTemplatesList();
      }
    });
  });
}

async function loadTemplate(tid) {
  try {
    const res = await fetch(`/api/templates/${tid}`);
    if (res.status === 403) {
      showToast("🔒 Plantilla privada: solo accesible como admin", "warning");
      return;
    }
    if (!res.ok) return;
    const t = await res.json();
    templateEditor.setValue(t.template);
    dataEditor.setValue(t.data);
    document.getElementById("visibility-select").value = t.visibility || "public";
    currentTemplateId = tid;
    refreshEditors();
    renderPreview();
    setStatus(`✓ Cargado: ${t.name}`, "success", 1500);
  } catch {
    setStatus("✗ Error al cargar", "error", 2000);
  }
}

// ── Dropdown toggle ───────────────────────────────────────────────────────────

function closeDropdown() {
  document.getElementById("templates-menu").classList.remove("open");
}

document.getElementById("btn-templates").addEventListener("click", (e) => {
  e.stopPropagation();
  const menu   = document.getElementById("templates-menu");
  const isOpen = menu.classList.contains("open");
  menu.classList.toggle("open");
  if (!isOpen) loadTemplatesList();
});

document.addEventListener("click", (e) => {
  const dd = document.getElementById("templates-dropdown");
  if (!dd.contains(e.target)) closeDropdown();
});

// ── Exportar PDF ──────────────────────────────────────────────────────────────

document.getElementById("btn-pdf").addEventListener("click", () => {
  const content   = document.getElementById("preview-frame");
  const hasContent = content.querySelector("h1, h2, table, p, .card, canvas");
  if (!hasContent) {
    setStatus("⚠ Genera un preview antes de exportar", "warning", 2000);
    return;
  }
  const opt = {
    margin: [10, 10],
    filename: "reporte.pdf",
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { format: "a4", orientation: "portrait" }
  };
  setStatus("⏳ Generando PDF...", "muted");
  html2pdf().set(opt).from(content).save().then(() => {
    setStatus("✓ PDF generado", "success", 1500);
  }).catch(() => {
    setStatus("✗ Error al generar PDF", "error", 2000);
  });
});

// ── Exportar Excel ────────────────────────────────────────────────────────────

document.getElementById("btn-excel").addEventListener("click", async () => {
  const data = dataEditor.getValue().trim();
  if (!data || data === "{}") {
    setStatus("⚠ Agrega datos JSON antes de exportar", "warning", 2000);
    return;
  }

  // Derive filename from current template name in status or use generic
  const filename = "reporte";
  setStatus("⏳ Generando Excel...", "muted");

  try {
    const res = await fetch("/export/excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, filename }),
    });

    if (!res.ok) {
      const err = await res.json();
      setStatus("✗ " + err.error, "error", 2500);
      return;
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus("✓ Excel generado", "success", 1500);
  } catch {
    setStatus("✗ Error al generar Excel", "error", 2000);
  }
});

// ── Selector de rol (permisos) ────────────────────────────────────────────────

document.querySelectorAll(".role-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const role = btn.dataset.role;
    const username = role === "admin" ? "Admin" : "Visitante";
    try {
      const res = await fetch("/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, username }),
      });
      if (res.ok) {
        // Update button styles
        document.querySelectorAll(".role-btn").forEach(b => {
          b.classList.remove("role-active", "role-admin");
        });
        btn.classList.add("role-active");
        if (role === "admin") btn.classList.add("role-admin");
        document.getElementById("role-user").textContent = username;
        // Re-render with new role
        renderPreview();
        loadTemplatesList();
        showToast(`Rol cambiado a: ${role}`, role === "admin" ? "success" : "info");
      }
    } catch {
      showToast("Error al cambiar rol", "error");
    }
  });
});

// ── Modal de programación de reportes ─────────────────────────────────────────

const scheduleOverlay = document.getElementById("schedule-overlay");

document.getElementById("btn-schedule").addEventListener("click", () => {
  scheduleOverlay.classList.remove("hidden");
  loadScheduleTemplates();
  loadScheduleList();
});

document.getElementById("schedule-close").addEventListener("click", () => {
  scheduleOverlay.classList.add("hidden");
});

scheduleOverlay.addEventListener("click", (e) => {
  if (e.target === scheduleOverlay) scheduleOverlay.classList.add("hidden");
});

async function loadScheduleTemplates() {
  const sel = document.getElementById("sched-template");
  try {
    const res  = await fetch("/api/templates");
    const list = await res.json();
    const opts = list.map(t => `<option value="${t.id}">${escHtml(t.name)}</option>`).join("");
    sel.innerHTML = `<option value="">— Ninguna —</option>${opts}`;
  } catch {}
}

async function loadScheduleList() {
  const listEl = document.getElementById("sched-list");
  try {
    const res  = await fetch("/api/schedules");
    const list = await res.json();
    if (!list.length) {
      listEl.innerHTML = `<div class="sched-empty">No hay reportes programados.</div>`;
      return;
    }

    const freqLabel = { daily: "Diaria", weekly: "Semanal", monthly: "Mensual" };

    listEl.innerHTML = list.map(s => {
      const nextRun  = s.next_run  ? new Date(s.next_run  + "Z").toLocaleString() : "—";
      const lastRun  = s.last_run  ? new Date(s.last_run  + "Z").toLocaleString() : "Nunca";
      const activeClass = s.active ? "sched-active" : "sched-inactive";
      return `<div class="sched-item ${activeClass}" data-id="${s.id}">
        <div class="sched-item-info">
          <span class="sched-name">${escHtml(s.name)}</span>
          <span class="sched-meta">${freqLabel[s.frequency] || s.frequency} · Próximo: ${nextRun} · Último: ${lastRun}</span>
        </div>
        <div class="sched-item-actions">
          <button class="sched-run"    data-id="${s.id}" title="Ejecutar ahora">▶</button>
          <button class="sched-toggle" data-id="${s.id}" title="${s.active ? 'Pausar' : 'Activar'}">${s.active ? "⏸" : "▶▶"}</button>
          <button class="sched-del"    data-id="${s.id}" title="Eliminar">✕</button>
        </div>
      </div>`;
    }).join("");

    listEl.querySelectorAll(".sched-run").forEach(btn => {
      btn.addEventListener("click", async () => {
        const sid = btn.dataset.id;
        const res = await fetch(`/api/schedules/${sid}/run`, { method: "POST" });
        if (res.ok) {
          showToast("✓ Reporte ejecutado", "success");
          loadScheduleList();
        }
      });
    });

    listEl.querySelectorAll(".sched-toggle").forEach(btn => {
      btn.addEventListener("click", async () => {
        const sid = btn.dataset.id;
        await fetch(`/api/schedules/${sid}/toggle`, { method: "POST" });
        loadScheduleList();
      });
    });

    listEl.querySelectorAll(".sched-del").forEach(btn => {
      btn.addEventListener("click", async () => {
        const sid = btn.dataset.id;
        if (confirm("¿Eliminar este reporte programado?")) {
          await fetch(`/api/schedules/${sid}`, { method: "DELETE" });
          loadScheduleList();
        }
      });
    });
  } catch {
    listEl.innerHTML = `<div class="sched-empty">Error al cargar.</div>`;
  }
}

document.getElementById("sched-save").addEventListener("click", async () => {
  const name = document.getElementById("sched-name").value.trim();
  const tid  = document.getElementById("sched-template").value || null;
  const freq = document.getElementById("sched-freq").value;

  if (!name) {
    showToast("⚠ Escribe un nombre para el reporte", "warning");
    return;
  }

  try {
    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, template_id: tid, frequency: freq }),
    });
    if (res.ok) {
      document.getElementById("sched-name").value = "";
      showToast("✓ Reporte programado", "success");
      loadScheduleList();
    } else {
      const err = await res.json();
      showToast("✗ " + err.error, "error");
    }
  } catch {
    showToast("✗ Error de conexión", "error");
  }
});

// ── Polling: reportes vencidos ────────────────────────────────────────────────

async function checkDueSchedules() {
  try {
    const res  = await fetch("/api/schedules/due");
    const list = await res.json();
    if (list.length) {
      showToast(`📅 ${list.length} reporte(s) pendiente(s) de ejecución`, "warning");
    }
  } catch {}
}

// Check on load and every 60s
checkDueSchedules();
setInterval(checkDueSchedules, 60_000);
