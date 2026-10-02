/* ===== CRI — lógica de la aplicación ===== */

let data = loadData();

/* ===== Navegación ===== */
const navStack = [];
let currentScreen = "menu";

function showScreen(id, push = true) {
  const next = document.getElementById("screen-" + id);
  if (!next) return;
  if (push && currentScreen !== id) navStack.push(currentScreen);
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  next.classList.add("active");
  currentScreen = id;
  refreshScreen(id);
}

function goBack() {
  const prev = navStack.pop() || "menu";
  showScreen(prev, false);
}

function refreshScreen(id) {
  switch (id) {
    case "menu": renderMenu(); break;
    case "members": renderMembers(); break;
    case "attendance": renderAttendance(); break;
    case "attendance-history": renderHistory(); break;
    case "attendance-day": renderDayDetail(); break;
    case "groups": renderGroups(); break;
    case "offerings": renderOfferings(); break;
    case "events": renderEvents(); break;
    case "member-detail": renderDetail(); break;
  }
  refreshDatePickers();
}

/* ===== Confirmación / alertas ===== */
let confirmAction = null;

function showConfirm({ emoji = "✅", title = "¡Listo!", text = "", okText = "Continuar", cancelText = null, onOk }) {
  document.getElementById("confirm-emoji").textContent = emoji;
  document.getElementById("confirm-title").textContent = title;
  document.getElementById("confirm-text").textContent = text;
  document.getElementById("confirm-ok").textContent = okText;
  const cancelBtn = document.getElementById("confirm-cancel");
  if (cancelText) {
    cancelBtn.hidden = false;
    cancelBtn.textContent = cancelText;
  } else {
    cancelBtn.hidden = true;
  }
  confirmAction = onOk || null;
  showScreen("confirm");
}

document.getElementById("confirm-ok").addEventListener("click", () => {
  const action = confirmAction;
  confirmAction = null;
  if (action) action(); else goBack();
});
document.getElementById("confirm-cancel").addEventListener("click", () => {
  confirmAction = null;
  goBack();
});

/* ===== Menú ===== */
function renderMenu() {
  document.getElementById("stat-members").textContent = data.members.length;
  const upcoming = data.events.filter(e => daysUntil(e.date) >= 0).length;
  document.getElementById("stat-week").textContent = upcoming;
}

document.querySelectorAll("#screen-menu .mode-btn").forEach(btn => {
  btn.addEventListener("click", () => showScreen(btn.dataset.screen));
});

/* ===== Botones "atrás" ===== */
document.querySelectorAll("[data-back]").forEach(btn => {
  btn.addEventListener("click", goBack);
});

/* ===== MIEMBROS ===== */
let searchQuery = "";

function renderMembers() {
  const list = document.getElementById("members-list");
  const empty = document.getElementById("members-empty");
  const q = searchQuery.trim().toLowerCase();

  const filtered = data.members.filter(m =>
    !q ||
    m.name.toLowerCase().includes(q) ||
    (m.phone || "").includes(q) ||
    (m.email || "").toLowerCase().includes(q) ||
    groupName(data, m.group).toLowerCase().includes(q)
  );

  document.getElementById("members-count").textContent = filtered.length;
  list.innerHTML = "";

  if (!filtered.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  filtered.forEach(m => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="li-icon">${initials(m.name)}</div>
      <div class="li-body">
        <strong>${escapeHTML(m.name)}</strong>
        <small>${escapeHTML(groupName(data, m.group))} · ${escapeHTML(m.phone || m.email || "Sin contacto")}</small>
      </div>
      <span class="li-badge">›</span>`;
    item.addEventListener("click", () => openDetail(m.id));
    list.appendChild(item);
  });
}

document.getElementById("member-search").addEventListener("input", e => {
  searchQuery = e.target.value;
  renderMembers();
});

document.getElementById("btn-add-member").addEventListener("click", () => openForm(null));

/* ===== Formulario miembro ===== */
let editingId = null;

function openForm(id) {
  editingId = id;
  const form = document.getElementById("member-form");
  form.reset();
  fillGroupOptions();

  const title = document.getElementById("form-title");
  const del = document.getElementById("f-delete");

  if (id) {
    const m = data.members.find(x => x.id === id);
    if (!m) return;
    title.textContent = "Editar miembro";
    del.classList.remove("hidden");
    document.getElementById("f-name").value = m.name || "";
    document.getElementById("f-phone").value = m.phone || "";
    document.getElementById("f-email").value = m.email || "";
    document.getElementById("f-group").value = m.group || "";
    document.getElementById("f-birthday").value = m.birthday || "";
    document.getElementById("f-notes").value = m.notes || "";
  } else {
    title.textContent = "Nuevo miembro";
    del.classList.add("hidden");
  }
  showScreen("member-form");
  updateDatePicker("f-birthday", id ? (m.birthday || "") : todayISO());
}

function fillGroupOptions() {
  const select = document.getElementById("f-group");
  select.innerHTML = '<option value="">Sin grupo</option>';
  data.groups.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = g.name;
    select.appendChild(opt);
  });
}

document.getElementById("member-form").addEventListener("submit", e => {
  e.preventDefault();
  const name = document.getElementById("f-name").value.trim();
  if (!name) return;

  const payload = {
    name,
    phone: document.getElementById("f-phone").value.trim(),
    email: document.getElementById("f-email").value.trim(),
    group: document.getElementById("f-group").value,
    birthday: document.getElementById("f-birthday").value,
    notes: document.getElementById("f-notes").value.trim()
  };

  if (editingId) {
    const m = data.members.find(x => x.id === editingId);
    Object.assign(m, payload);
  } else {
    data.members.push({ id: uid("m"), createdAt: todayISO(), ...payload });
  }

  saveData(data);
  showConfirm({
    emoji: "✅",
    title: editingId ? "Miembro actualizado" : "Miembro agregado",
    text: `${name} fue ${editingId ? "actualizado" : "registrado"} correctamente.`,
    onOk: () => { editingId = null; showScreen("members", false); }
  });
});

document.getElementById("f-delete").addEventListener("click", () => {
  const m = data.members.find(x => x.id === editingId);
  if (!m) return;
  showConfirm({
    emoji: "🗑️",
    title: "¿Eliminar miembro?",
    text: `Se eliminará a ${m.name} de forma permanente.`,
    okText: "Sí, eliminar",
    cancelText: "Cancelar",
    onOk: () => {
      data.members = data.members.filter(x => x.id !== editingId);
      Object.keys(data.attendance).forEach(k => {
        data.attendance[k] = data.attendance[k].filter(id => id !== editingId);
      });
      saveData(data);
      editingId = null;
      showScreen("members", false);
    }
  });
});

/* ===== Ficha de miembro ===== */
let detailId = null;

function openDetail(id) {
  detailId = id;
  showScreen("member-detail");
}

function renderDetail() {
  const m = data.members.find(x => x.id === detailId);
  if (!m) { showScreen("members", false); return; }

  document.getElementById("d-avatar").textContent = initials(m.name);
  document.getElementById("d-name").textContent = m.name;
  document.getElementById("d-group").textContent = groupName(data, m.group);
  document.getElementById("d-phone").textContent = formatPhone(m.phone);
  document.getElementById("d-email").textContent = m.email || "No registrado";
  document.getElementById("d-birthday").textContent = m.birthday ? formatDate(m.birthday) : "No registrada";

  const ageEl = document.getElementById("d-age");
  const countdownEl = document.getElementById("d-bday-countdown");
  if (m.birthday) {
    ageEl.textContent = formatAge(m.birthday);
    countdownEl.textContent = formatBirthdayCountdown(m.birthday);
  } else {
    ageEl.textContent = "Sin fecha registrada";
    countdownEl.textContent = "Agrega la fecha de nacimiento";
  }

  const total = Object.values(data.attendance).filter(arr => arr.includes(m.id)).length;
  document.getElementById("d-attendance").textContent = `${total} reuniones asistidas`;

  const notesWrap = document.getElementById("d-notes-wrap");
  if (m.notes) {
    notesWrap.classList.remove("hidden");
    document.getElementById("d-notes").textContent = m.notes;
  } else {
    notesWrap.classList.add("hidden");
  }
}

document.getElementById("d-edit").addEventListener("click", () => openForm(detailId));

/* ===== ASISTENCIA ===== */
let attendanceDate = todayISO();

function renderAttendance() {
  const dateInput = document.getElementById("att-date");
  dateInput.value = attendanceDate;
  updateDatePicker("att-date", attendanceDate);

  const list = document.getElementById("attendance-list");
  const marked = data.attendance[attendanceDate] || [];
  list.innerHTML = "";

  document.getElementById("att-total").textContent = data.members.length;
  document.getElementById("att-present").textContent = marked.length;
  const pct = data.members.length
    ? Math.round((marked.length / data.members.length) * 100)
    : 0;
  document.getElementById("att-percent").textContent = pct;

  data.members.forEach(m => {
    const checked = marked.includes(m.id);
    const item = document.createElement("div");
    item.className = "list-item" + (checked ? " checked" : "");
    item.innerHTML = `
      <div class="li-icon">${initials(m.name)}</div>
      <div class="li-body">
        <strong>${escapeHTML(m.name)}</strong>
        <small>${escapeHTML(groupName(data, m.group))}</small>
      </div>
      <div class="li-check">✓</div>`;
    item.addEventListener("click", () => toggleAttendance(m.id));
    list.appendChild(item);
  });
}

function toggleAttendance(memberId) {
  const current = data.attendance[attendanceDate] || [];
  const idx = current.indexOf(memberId);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(memberId);
  data.attendance[attendanceDate] = current;
  saveData(data);
  renderAttendance();
}

document.getElementById("att-date").addEventListener("change", e => {
  attendanceDate = e.target.value || todayISO();
  renderAttendance();
});

document.getElementById("att-save").addEventListener("click", () => {
  const marked = (data.attendance[attendanceDate] || []).length;
  showConfirm({
    emoji: "📋",
    title: "Asistencia guardada",
    text: `${marked} de ${data.members.length} miembros presentes el ${formatDate(attendanceDate)}.`,
    onOk: () => showScreen("menu", false)
  });
});

/* ===== HISTORIAL DE ASISTENCIA (consulta rápida por fecha) ===== */
const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
let historyFilter = "";

function weekdayOf(iso) {
  return WEEKDAYS[parseISO(iso).getDay()];
}

function renderHistory() {
  const list = document.getElementById("history-list");
  const empty = document.getElementById("history-empty");
  document.getElementById("hist-date-filter").value = historyFilter;
  updateDatePicker("hist-date-filter", historyFilter);
  list.innerHTML = "";

  let dates = Object.keys(data.attendance);
  if (historyFilter) dates = dates.filter(d => d === historyFilter);
  dates.sort((a, b) => (a < b ? 1 : -1));

  if (!dates.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  dates.forEach(date => {
    const present = (data.attendance[date] || []).length;
    const total = data.members.length;
    const pct = total ? Math.round((present / total) * 100) : 0;
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="li-icon">🗓</div>
      <div class="li-body">
        <strong>${formatDate(date)} · ${weekdayOf(date)}</strong>
        <small>${present} de ${total} miembros · ${pct}%</small>
      </div>
      <span class="li-badge">›</span>`;
    item.addEventListener("click", () => openDayDetail(date));
    list.appendChild(item);
  });
}

document.getElementById("att-history-btn").addEventListener("click", () => {
  historyFilter = "";
  showScreen("attendance-history");
});

document.getElementById("hist-date-filter").addEventListener("change", e => {
  historyFilter = e.target.value || "";
  renderHistory();
});

document.getElementById("hist-clear-filter").addEventListener("click", () => {
  historyFilter = "";
  renderHistory();
});

/* ===== DETALLE DE UN DÍA ===== */
let dayDetailDate = null;

function openDayDetail(date) {
  dayDetailDate = date;
  showScreen("attendance-day");
}

function renderDayDetail() {
  if (!dayDetailDate) { showScreen("attendance-history", false); return; }
  const marked = data.attendance[dayDetailDate] || [];
  const total = data.members.length;
  const pct = total ? Math.round((marked.length / total) * 100) : 0;

  document.getElementById("day-title").textContent = `${formatDate(dayDetailDate)}`;
  document.getElementById("day-present").textContent = marked.length;
  document.getElementById("day-total").textContent = total;
  document.getElementById("day-percent").textContent = pct;

  const list = document.getElementById("day-list");
  list.innerHTML = "";

  data.members.forEach(m => {
    const present = marked.includes(m.id);
    const item = document.createElement("div");
    item.className = "list-item" + (present ? " checked" : "");
    item.innerHTML = `
      <div class="li-icon">${initials(m.name)}</div>
      <div class="li-body">
        <strong>${escapeHTML(m.name)}</strong>
        <small>${escapeHTML(groupName(data, m.group))}</small>
      </div>
      <span class="li-badge">${present ? "✅ Presente" : "—"}</span>`;
    list.appendChild(item);
  });
}

document.getElementById("day-edit").addEventListener("click", () => {
  attendanceDate = dayDetailDate;
  showScreen("attendance", false);
});

/* ===== GRUPOS ===== */
function renderGroups() {
  const list = document.getElementById("groups-list");
  const empty = document.getElementById("groups-empty");
  document.getElementById("groups-count").textContent = data.groups.length;
  list.innerHTML = "";

  if (!data.groups.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  data.groups.forEach(g => {
    const count = data.members.filter(m => m.group === g.id).length;
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="li-icon">🤝</div>
      <div class="li-body">
        <strong>${escapeHTML(g.name)}</strong>
        <small>${escapeHTML(g.leader || "Sin líder")} · ${escapeHTML(g.day)}</small>
      </div>
      <span class="li-badge">${count} 👥</span>`;
    list.appendChild(item);
  });
}

document.getElementById("btn-add-group").addEventListener("click", () => {
  document.getElementById("group-form").reset();
  showScreen("group-form");
});

document.getElementById("group-form").addEventListener("submit", e => {
  e.preventDefault();
  const name = document.getElementById("g-name").value.trim();
  if (!name) return;

  data.groups.push({
    id: uid("g"),
    name,
    leader: document.getElementById("g-leader").value.trim(),
    day: document.getElementById("g-day").value,
    desc: document.getElementById("g-desc").value.trim()
  });
  saveData(data);

  showConfirm({
    emoji: "🤝",
    title: "Grupo creado",
    text: `${name} ya está disponible para asignar miembros.`,
    onOk: () => showScreen("groups", false)
  });
});

/* ===== OFRENDAS ===== */
function renderOfferings() {
  const list = document.getElementById("offerings-list");
  const empty = document.getElementById("offerings-empty");
  list.innerHTML = "";

  const sorted = [...data.offerings].sort((a, b) => (a.date < b.date ? 1 : -1));

  const totalIncome = data.offerings
    .filter(o => !isExpense(o))
    .reduce((s, o) => s + Number(o.amount || 0), 0);
  const totalExpenses = data.offerings
    .filter(o => isExpense(o))
    .reduce((s, o) => s + Number(o.amount || 0), 0);
  const balance = totalIncome - totalExpenses;
  const lastIncome = sorted.filter(o => !isExpense(o))[0];
  const last = lastIncome ? Number(lastIncome.amount || 0) : 0;

  document.getElementById("off-total").textContent = formatMoney(totalIncome);
  document.getElementById("off-last").textContent = formatMoney(last);
  document.getElementById("off-expenses").textContent = "−" + formatMoney(totalExpenses);
  document.getElementById("off-balance").textContent = formatMoney(balance);
  document.getElementById("off-balance").style.color = balance < 0 ? "var(--danger)" : "";

  if (!sorted.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  sorted.forEach(o => {
    const expense = isExpense(o);
    const item = document.createElement("div");
    item.className = "list-item" + (expense ? " expense" : "");
    item.innerHTML = `
      <div class="li-icon">${expense ? "📤" : "💰"}</div>
      <div class="li-body">
        <strong>${expense ? "−" : "+"}${formatMoney(o.amount)}</strong>
        <small>${escapeHTML(o.type)} · ${formatDate(o.date)}${o.notes ? " · " + escapeHTML(o.notes) : ""}</small>
      </div>
      <span class="li-badge">✏️</span>`;
    item.addEventListener("click", () => openOfferingForm(o.id));
    list.appendChild(item);
  });
}

/* ===== Formulario de movimientos (alta, edición y eliminación) ===== */
let editingOfferingId = null;

function fillTypeOptions(selected) {
  const select = document.getElementById("o-type");
  select.innerHTML = "";
  INCOME_TYPES.concat(EXPENSE_TYPES).forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    if (t === selected) opt.selected = true;
    select.appendChild(opt);
  });
}

function syncOfferingFormMode() {
  const type = document.getElementById("o-type").value;
  const expense = type === "Gasto";
  document.getElementById("off-form-title").textContent = editingOfferingId
    ? "Editar movimiento"
    : expense ? "Registrar gasto" : "Registrar ofrenda";
  document.getElementById("off-form-icon").textContent = expense ? "📤" : "💰";
  document.getElementById("off-form-submit").textContent = editingOfferingId
    ? "Guardar cambios"
    : expense ? "Guardar gasto" : "Guardar ofrenda";
}

function openOfferingForm(id, presetType) {
  editingOfferingId = id || null;
  const form = document.getElementById("offering-form");
  form.reset();

  const deleteBtn = document.getElementById("off-delete");

  if (id) {
    const o = data.offerings.find(x => x.id === id);
    if (!o) return;
    document.getElementById("o-date").value = o.date || todayISO();
    document.getElementById("o-amount").value = o.amount || "";
    fillTypeOptions(o.type);
    document.getElementById("o-notes").value = o.notes || "";
    deleteBtn.classList.remove("hidden");
  } else {
    const type = presetType || "Ofrenda";
    document.getElementById("o-date").value = todayISO();
    fillTypeOptions(type);
    deleteBtn.classList.add("hidden");
  }

  syncOfferingFormMode();
  showScreen("offering-form");
  updateDatePicker("o-date", document.getElementById("o-date").value || todayISO());
}

document.getElementById("o-type").addEventListener("change", syncOfferingFormMode);

document.getElementById("btn-add-offering").addEventListener("click", () => openOfferingForm(null, "Ofrenda"));
document.getElementById("btn-add-expense").addEventListener("click", () => openOfferingForm(null, "Gasto"));

document.getElementById("offering-form").addEventListener("submit", e => {
  e.preventDefault();
  const amount = Number(document.getElementById("o-amount").value);
  if (!amount) return;

  const payload = {
    date: document.getElementById("o-date").value || todayISO(),
    amount,
    type: document.getElementById("o-type").value,
    notes: document.getElementById("o-notes").value.trim()
  };

  if (editingOfferingId) {
    const o = data.offerings.find(x => x.id === editingOfferingId);
    if (o) Object.assign(o, payload);
  } else {
    data.offerings.push({ id: uid("o"), ...payload });
  }
  saveData(data);

  const expense = payload.type === "Gasto";
  showConfirm({
    emoji: expense ? "📤" : "💰",
    title: editingOfferingId
      ? "Movimiento actualizado"
      : expense ? "Gasto registrado" : "Ofrenda registrada",
    text: `${formatMoney(amount)} · ${payload.type}`,
    onOk: () => { editingOfferingId = null; showScreen("offerings", false); }
  });
});

document.getElementById("off-delete").addEventListener("click", () => {
  const o = data.offerings.find(x => x.id === editingOfferingId);
  if (!o) return;
  showConfirm({
    emoji: "🗑️",
    title: "¿Eliminar movimiento?",
    text: `Se eliminará ${isExpense(o) ? "el gasto" : "la ofrenda"} de ${formatMoney(o.amount)} del ${formatDate(o.date)}.`,
    okText: "Sí, eliminar",
    cancelText: "Cancelar",
    onOk: () => {
      data.offerings = data.offerings.filter(x => x.id !== editingOfferingId);
      saveData(data);
      editingOfferingId = null;
      showScreen("offerings", false);
    }
  });
});

/* ===== EVENTOS ===== */
function renderEvents() {
  const list = document.getElementById("events-list");
  const empty = document.getElementById("events-empty");
  document.getElementById("events-count").textContent = data.events.length;
  list.innerHTML = "";

  const today = todayISO();
  const past = data.events.filter(ev => ev.date < today);
  document.getElementById("events-past-count").textContent = past.length;
  document.getElementById("btn-purge-events").classList.toggle("hidden", past.length === 0);

  let sorted = [...data.events].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!sorted.length) {
    empty.classList.remove("hidden");
    empty.querySelector("p").textContent = "Sin eventos programados";
    return;
  }
  empty.classList.add("hidden");

  sorted.forEach(ev => {
    const diff = daysUntil(ev.date);
    let when;
    if (diff < 0) {
      when = `Hace ${formatCountdown(...Object.values(diffMonthsWeeksDays(ev.date, today)))}`;
    } else if (diff === 0) when = "¡Hoy!";
    else if (diff === 1) when = "Mañana";
    else when = formatCountdown(...Object.values(diffMonthsWeeksDays(today, ev.date)));

    const isPast = diff < 0;
    const item = document.createElement("div");
    item.className = "list-item" + (isPast ? " past" : "");
    item.innerHTML = `
      <div class="li-icon">📅</div>
      <div class="li-body">
        <strong>${escapeHTML(ev.title)}</strong>
        <small>${formatDate(ev.date)}${ev.time ? " · " + escapeHTML(ev.time) : ""}${ev.desc ? " · " + escapeHTML(ev.desc) : ""}</small>
      </div>
      <span class="li-badge">${when}</span>`;
    item.addEventListener("click", () => openEventForm(ev.id));
    list.appendChild(item);
  });
}

/* ===== Selector de fecha reutilizable (con salto rápido de año) ===== */
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const pickers = {}; // inputId -> { year, month }
let activePicker = null;

function renderPicker(inputId) {
  const p = pickers[inputId];
  const input = document.getElementById(inputId);
  const wrap = document.getElementById(inputId + "-dp");
  if (!p || !input || !wrap) return;

  const current = input.value || "";
  const today = todayISO();

  document.getElementById(inputId + "-dp-label").textContent = `${MONTH_NAMES[p.month]} ${p.year}`;
  const display = document.getElementById(inputId + "-dp-display");
  if (display) {
    if (current) display.textContent = formatDate(current);
    else if (inputId === "hist-date-filter") display.textContent = "Todas las fechas";
    else display.textContent = "Sin fecha";
  }

  const grid = document.getElementById(inputId + "-dp-grid");
  grid.innerHTML = "";

  const first = new Date(p.year, p.month, 1);
  const startOffset = (first.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(p.year, p.month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    const cell = document.createElement("div");
    if (dayNum < 1 || dayNum > daysInMonth) {
      cell.className = "dp-cell empty";
      grid.appendChild(cell);
      continue;
    }

    const iso = `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    cell.className = "dp-cell";
    if (iso === today) cell.classList.add("today");
    if (iso === current) cell.classList.add("selected");
    cell.innerHTML = `<span>${dayNum}</span>`;

    cell.addEventListener("click", () => {
      input.value = iso;
      renderPicker(inputId);
      input.dispatchEvent(new Event("change"));
    });
    grid.appendChild(cell);
  }
}

function updateDatePicker(inputId, focusISO) {
  const p = pickers[inputId];
  const input = document.getElementById(inputId);
  if (!p || !input) return;
  const iso = focusISO || input.value || todayISO();
  const d = parseISO(iso);
  p.year = d.getFullYear();
  p.month = d.getMonth();
  renderPicker(inputId);
}

function refreshDatePickers() {
  Object.keys(pickers).forEach(id => renderPicker(id));
}

Object.keys(pickers).forEach(initPicker);

function initPicker(inputId) {
  const input = document.getElementById(inputId);
  const wrap = document.getElementById(inputId + "-dp");
  if (!input || !wrap || input.dataset.dpReady) return;
  input.dataset.dpReady = "1";
  input.classList.add("hidden");

  document.getElementById(inputId + "-dp-prev-month").addEventListener("click", () => {
    const p = pickers[inputId];
    p.month -= 1;
    if (p.month < 0) { p.month = 11; p.year -= 1; }
    renderPicker(inputId);
  });
  document.getElementById(inputId + "-dp-next-month").addEventListener("click", () => {
    const p = pickers[inputId];
    p.month += 1;
    if (p.month > 11) { p.month = 0; p.year += 1; }
    renderPicker(inputId);
  });
  document.getElementById(inputId + "-dp-prev-year").addEventListener("click", () => {
    pickers[inputId].year -= 1;
    renderPicker(inputId);
  });
  document.getElementById(inputId + "-dp-next-year").addEventListener("click", () => {
    pickers[inputId].year += 1;
    renderPicker(inputId);
  });

  wrap._dpClose = () => {
    wrap.classList.add("hidden");
    activePicker = null;
  };
}

function toggleDatePicker(inputId) {
  const wrap = document.getElementById(inputId + "-dp");
  const overlay = document.getElementById("dp-overlay");
  if (!wrap) return;
  const opening = wrap.classList.contains("hidden");
  closeAllDatePickers();
  if (opening) {
    activePicker = inputId;
    wrap.classList.remove("hidden");
    if (overlay) overlay.classList.remove("hidden");
    updateDatePicker(inputId);
  }
}

function closeAllDatePickers() {
  Object.keys(pickers).forEach(id => {
    const wrap = document.getElementById(id + "-dp");
    if (wrap) wrap.classList.add("hidden");
  });
  const overlay = document.getElementById("dp-overlay");
  if (overlay) overlay.classList.add("hidden");
  activePicker = null;
}

const DATE_INPUTS = ["f-birthday", "att-date", "hist-date-filter", "o-date", "e-date"];

DATE_INPUTS.forEach(id => {
  pickers[id] = { year: 2000, month: 0 };
  initPicker(id);
  // El input nativo está oculto (display:none) así que nunca recibe foco;
  // el elemento visible que el usuario toca es el .date-display.
  const display = document.getElementById(id + "-dp-display");
  if (display) {
    display.addEventListener("click", () => toggleDatePicker(id));
  }
  const input = document.getElementById(id);
  input.addEventListener("focus", e => {
    e.target.blur();
    toggleDatePicker(id);
  });
});

document.getElementById("dp-overlay").addEventListener("click", closeAllDatePickers);

document.getElementById("hist-clear-filter").addEventListener("click", () => {
  document.getElementById("hist-date-filter").value = "";
  renderPicker("hist-date-filter");
});

/* ===== Formulario de eventos (alta, edición y eliminación) ===== */
let editingEventId = null;

function openEventForm(id) {
  editingEventId = id || null;
  const form = document.getElementById("event-form");
  form.reset();

  const deleteBtn = document.getElementById("ev-delete");
  let dateVal = todayISO();

  if (id) {
    const ev = data.events.find(x => x.id === id);
    if (!ev) return;
    document.getElementById("ev-form-title").textContent = "Editar evento";
    document.getElementById("ev-form-submit").textContent = "Guardar cambios";
    document.getElementById("e-title").value = ev.title || "";
    dateVal = ev.date || todayISO();
    document.getElementById("e-time").value = ev.time || "";
    document.getElementById("e-desc").value = ev.desc || "";
    deleteBtn.classList.remove("hidden");
  } else {
    document.getElementById("ev-form-title").textContent = "Nuevo evento";
    document.getElementById("ev-form-submit").textContent = "Guardar evento";
    deleteBtn.classList.add("hidden");
  }

  document.getElementById("e-date").value = dateVal;
  showScreen("event-form");
  updateDatePicker("e-date", dateVal);
}

document.getElementById("btn-add-event").addEventListener("click", () => openEventForm(null));

document.getElementById("event-form").addEventListener("submit", e => {
  e.preventDefault();
  const title = document.getElementById("e-title").value.trim();
  if (!title) return;

  const payload = {
    title,
    date: document.getElementById("e-date").value || todayISO(),
    time: document.getElementById("e-time").value,
    desc: document.getElementById("e-desc").value.trim()
  };

  if (editingEventId) {
    const ev = data.events.find(x => x.id === editingEventId);
    if (ev) Object.assign(ev, payload);
  } else {
    data.events.push({ id: uid("e"), ...payload });
  }
  saveData(data);

  showConfirm({
    emoji: "📅",
    title: editingEventId ? "Evento actualizado" : "Evento creado",
    text: `${title} · ${formatDate(payload.date)}`,
    onOk: () => { editingEventId = null; showScreen("events", false); }
  });
});

document.getElementById("ev-delete").addEventListener("click", () => {
  const ev = data.events.find(x => x.id === editingEventId);
  if (!ev) return;
  showConfirm({
    emoji: "🗑️",
    title: "¿Eliminar evento?",
    text: `Se eliminará "${ev.title}" del ${formatDate(ev.date)}.`,
    okText: "Sí, eliminar",
    cancelText: "Cancelar",
    onOk: () => {
      data.events = data.events.filter(x => x.id !== editingEventId);
      saveData(data);
      editingEventId = null;
      showScreen("events", false);
    }
  });
});

/* ===== Limpiar eventos pasados ===== */
document.getElementById("btn-purge-events").addEventListener("click", () => {
  const today = todayISO();
  const past = data.events.filter(ev => ev.date < today);
  if (!past.length) return;
  showConfirm({
    emoji: "🕓",
    title: "¿Limpiar eventos pasados?",
    text: `Se eliminarán ${past.length} ${plural(past.length, "evento")} que ya ${past.length === 1 ? "pasó" : "pasaron"}.`,
    okText: "Sí, limpiar",
    cancelText: "Cancelar",
    onOk: () => {
      data.events = data.events.filter(ev => ev.date >= today);
      saveData(data);
      showScreen("events", false);
    }
  });
});

/* ===== Utilidades de UI ===== */
function initials(name) {
  const parts = (name || "?").trim().split(/\s+/);
  const a = parts[0] ? parts[0][0] : "?";
  const b = parts[1] ? parts[1][0] : "";
  return (a + b).toUpperCase();
}

function escapeHTML(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ===== Inicio ===== */
renderMenu();
