/* ===== CRI — datos de ejemplo y utilidades ===== */

const STORE_KEY = "mana_church_data";

/* Datos iniciales (solo se cargan la primera vez) */
const SEED_DATA = {
  members: [
    {
      id: "m1",
      name: "María González",
      phone: "81 1234 5678",
      email: "maria@ejemplo.com",
      group: "g1",
      birthday: "1990-04-12",
      notes: "Hermana de oración. Ayuda en el ministerio de alabanza.",
      createdAt: "2024-01-15"
    },
    {
      id: "m2",
      name: "Juan Pérez",
      phone: "81 2345 6789",
      email: "juan@ejemplo.com",
      group: "g2",
      birthday: "1985-09-30",
      notes: "Líder de sonido. Disponible los miércoles.",
      createdAt: "2024-02-03"
    },
    {
      id: "m3",
      name: "Ana Martínez",
      phone: "81 3456 7890",
      email: "",
      group: "g1",
      birthday: "1998-12-05",
      notes: "Estudiante. Participa en el coro de jóvenes.",
      createdAt: "2024-03-21"
    },
    {
      id: "m4",
      name: "Carlos Ramírez",
      phone: "",
      email: "carlos@ejemplo.com",
      group: "",
      birthday: "1978-06-18",
      notes: "Nuevo convertido. Requiere discipulado.",
      createdAt: "2024-05-10"
    }
  ],
  groups: [
    { id: "g1", name: "Jóvenes en Llama", leader: "María González", day: "Viernes", desc: "Grupo de jóvenes de 18 a 30 años." },
    { id: "g2", name: "Célula Familias", leader: "Juan Pérez", day: "Miércoles", desc: "Parejas y familias. Cada hogar abre su casa." }
  ],
  offerings: [
    { id: "o1", date: "2026-09-20", amount: 2450, type: "Ofrenda", notes: "Domingo habitual" },
    { id: "o2", date: "2026-09-27", amount: 1800, type: "Diezmo", notes: "" },
    { id: "o3", date: "2026-09-27", amount: 950, type: "Ofrenda", notes: "Jóvenes en Llama" },
    { id: "o4", date: "2026-09-28", amount: 450, type: "Gasto", notes: "Materiales de limpieza" },
    { id: "o5", date: "2026-09-30", amount: 1200, type: "Gasto", notes: "Papelería y sonido" }
  ],
  events: [
    { id: "e1", title: "Culto de domingo", date: "2026-10-04", time: "11:00", desc: "Culto general en el templo principal." },
    { id: "e2", title: "Reunión de líderes", date: "2026-10-07", time: "19:00", desc: "Sala de consejo. Asistencia obligatoria." },
    { id: "e3", title: "Retiro de jóvenes", date: "2026-10-24", time: "08:00", desc: "Salida desde la iglesia. Inscripción abierta." }
  ],
  /* Asistencia: { "YYYY-MM-DD": ["m1", "m3", ...] } */
  attendance: {}
};

/* ===== Persistencia ===== */
function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("No se pudieron leer los datos:", e);
  }
  return JSON.parse(JSON.stringify(SEED_DATA));
}

function saveData(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("No se pudieron guardar los datos:", e);
  }
}

/* ===== Utilidades ===== */
function uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatMoney(amount) {
  return "$" + Number(amount || 0).toLocaleString("es-MX");
}

function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatPhone(phone) {
  return phone || "No registrado";
}

function groupById(data, id) {
  if (!id) return null;
  return data.groups.find(g => g.id === id) || null;
}

function groupName(data, id) {
  const g = groupById(data, id);
  return g ? g.name : "Sin grupo";
}

/* Tipos de ingreso y de gasto */
const INCOME_TYPES = ["Ofrenda", "Diezmo", "Ofrenda especial", "Misiones", "Building fund"];
const EXPENSE_TYPES = ["Gasto"];

function isExpense(entry) {
  return entry && entry.type === "Gasto";
}

function todayISO() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysUntil(iso) {
  const target = new Date(iso + "T00:00:00");
  const now = new Date(todayISO() + "T00:00:00");
  return Math.round((target - now) / 86400000);
}

/* ===== Edad exacta y cuenta regresiva de cumpleaños ===== */

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* Edad exacta en años, meses y días (sin horas ni minutos) */
function calcAge(birthdayISO) {
  const b = parseISO(birthdayISO);
  const t = parseISO(todayISO());

  let years = t.getFullYear() - b.getFullYear();
  let months = t.getMonth() - b.getMonth();
  let days = t.getDate() - b.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(t.getFullYear(), t.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

/* Fecha del próximo cumpleaños (solo mes y día) */
function nextBirthdayISO(birthdayISO) {
  const b = parseISO(birthdayISO);
  const t = parseISO(todayISO());
  let year = t.getFullYear();
  const candidate = new Date(year, b.getMonth(), b.getDate());
  if (candidate < t) year += 1;
  const pad = n => String(n).padStart(2, "0");
  return `${year}-${pad(b.getMonth() + 1)}-${pad(b.getDate())}`;
}

/* Diferencia exacta en meses, semanas y días entre dos fechas */
function diffMonthsWeeksDays(fromISO, toISO) {
  const from = parseISO(fromISO);
  const to = parseISO(toISO);

  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  let cursor = new Date(from.getFullYear(), from.getMonth() + months, from.getDate());
  if (cursor > to) {
    months -= 1;
    cursor = new Date(from.getFullYear(), from.getMonth() + months, from.getDate());
  }

  let restDays = Math.round((to - cursor) / 86400000);
  const weeks = Math.floor(restDays / 7);
  const days = restDays % 7;

  return { months, weeks, days };
}

function plural(n, word) {
  if (n === 1) return word;
  if (word === "mes") return "meses";
  return word + "s";
}

/* "5 meses, 2 semanas y 3 días" — sin horas ni minutos */
function formatCountdown(months, weeks, days) {
  const parts = [];
  if (months > 0) parts.push(`${months} ${plural(months, "mes")}`);
  if (weeks > 0) parts.push(`${weeks} ${plural(weeks, "semana")}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ${plural(days, "día")}`);

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} y ${parts[1]}`;
  return `${parts[0]}, ${parts[1]} y ${parts[2]}`;
}

/* Texto completo: edad exacta del miembro */
function formatAge(birthdayISO) {
  const { years, months, days } = calcAge(birthdayISO);
  const parts = [`${years} ${plural(years, "año")}`];
  if (months > 0) parts.push(`${months} ${plural(months, "mes")}`);
  if (days > 0 || parts.length === 1) parts.push(`${days} ${plural(days, "día")}`);

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} y ${parts[1]}`;
  return `${parts[0]}, ${parts[1]} y ${parts[2]}`;
}

/* Texto completo: tiempo restante para el próximo cumpleaños */
function formatBirthdayCountdown(birthdayISO) {
  const next = nextBirthdayISO(birthdayISO);
  const diff = diffMonthsWeeksDays(todayISO(), next);

  if (diff.months === 0 && diff.weeks === 0 && diff.days === 0) {
    return "¡Es hoy! 🎉";
  }
  return formatCountdown(diff.months, diff.weeks, diff.days);
}
