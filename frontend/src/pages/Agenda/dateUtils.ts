// Convencion de fechas de todo el sistema: los horarios se tratan como
// "hora de pared" del salon (Argentina), guardados con sufijo Z pero SIN
// conversion real de huso horario (ej. "09:00 del salon" se guarda como
// "09:00:00.000Z"). Es una simplificacion deliberada valida porque el salon
// opera en un unico huso horario fijo (Argentina no tiene horario de verano).
// Por eso aca nunca se usa `new Date(str)` + `toISOString()` para convertir
// un input del usuario (eso aplicaria el huso horario de la maquina del
// navegador) - siempre se arma/lee el string ISO directamente.

export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateKey: string, days: number): string {
  const d = parseDateKey(dateKey);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateKey(d);
}

// El salon atiende martes(2) a sabado(6). Devuelve los 5 dias de la semana
// (que contiene dateKey) en ese rango. Si dateKey cae domingo o lunes (el
// salon esta cerrado), muestra la semana que viene en vez de la que ya
// termino - un domingo/lunes no "pertenece" a ninguna semana de atencion
// todavia transcurrida, asi que lo logico es ir para adelante.
export function getWeekDays(dateKey: string): string[] {
  const dow = parseDateKey(dateKey).getUTCDay();
  const offsetToTuesday = dow === 0 ? 2 : dow === 1 ? 1 : -(dow - 2);
  const tuesday = addDays(dateKey, offsetToTuesday);
  return [0, 1, 2, 3, 4].map((i) => addDays(tuesday, i));
}

export function dayRange(dateKey: string): { from: Date; to: Date } {
  return {
    from: new Date(`${dateKey}T00:00:00.000Z`),
    to: new Date(`${dateKey}T23:59:59.999Z`),
  };
}

export function startOfMonth(dateKey: string): string {
  return `${dateKey.slice(0, 7)}-01`;
}

export function addMonths(dateKey: string, months: number): string {
  const [y, m] = dateKey.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, '0')}-01`;
}

export function monthRange(dateKey: string): { from: Date; to: Date } {
  const from = `${startOfMonth(dateKey)}T00:00:00.000Z`;
  const nextMonth = addMonths(dateKey, 1);
  const to = new Date(`${nextMonth}T00:00:00.000Z`);
  to.setUTCMilliseconds(to.getUTCMilliseconds() - 1);
  return { from: new Date(from), to };
}

export function formatMonthLabel(dateKey: string): string {
  const d = parseDateKey(startOfMonth(dateKey));
  const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Matriz de 6 semanas (Lunes a Domingo) que cubre el mes de dateKey, incluyendo
// dias de relleno del mes anterior/siguiente para completar las semanas.
export function getMonthMatrix(dateKey: string): string[][] {
  const first = startOfMonth(dateKey);
  const firstDow = parseDateKey(first).getUTCDay(); // 0=domingo
  const offset = (firstDow + 6) % 7; // dias a retroceder para llegar al lunes
  const gridStart = addDays(first, -offset);

  const weeks: string[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(addDays(gridStart, w * 7 + d));
    }
    weeks.push(week);
  }
  return weeks;
}

export function formatDayLabel(dateKey: string): string {
  const d = parseDateKey(dateKey);
  const label = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function localInputToIso(value: string): string {
  return `${value}:00.000Z`;
}

export function isoToLocalInput(iso: string): string {
  return iso.slice(0, 16);
}

export function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

export function minutesFromMidnight(iso: string): number {
  const [h, m] = iso.slice(11, 16).split(':').map(Number);
  return h * 60 + m;
}
