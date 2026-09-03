const mxn = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

// El backend maneja todo en centavos (enteros); esto muestra pesos enteros.
// El signo va antes del "$" ("-$150", no "$-150"): Intl.format ya lo antepone al número.
export const money = (cents: number): string => {
  const pesos = mxn.format(Math.abs(cents) / 100);
  return cents < 0 ? `-$${pesos}` : `$${pesos}`;
};

export const fechaCorta = (iso: string): string =>
  new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(`${iso}T00:00:00`));

export const mesCorto = (periodo: string): string =>
  new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric' }).format(new Date(`${periodo}-01T00:00:00`));

export const mesLargo = (periodo: string): string => {
  const mes = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(new Date(`${periodo}-01T00:00:00`));
  return `${mes} ${periodo.slice(0, 4)}`;
};

// "Copiar mes anterior" (Fase 3) necesita el YYYY-MM previo al periodo dado.
export const mesAnterior = (periodo: string): string => {
  const [y, m] = periodo.split('-').map(Number);
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
};

export const periodoActual = (): string => new Date().toISOString().slice(0, 7);

// "Ana", "Ana y Luis", "Ana, Luis y Ceci" — un hogar puede tener cualquier número de
// miembros (Fase 5 del escalado a usuarios), ya no es siempre "tú y tu pareja".
export const listaNombres = (nombres: string[]): string =>
  nombres.length <= 1 ? (nombres[0] ?? '') : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;

export interface Delta {
  texto: string;
  color: string;
}

// "vs. mes pasado": arriba no siempre es bueno (gasto vs. ingreso/ahorro), así que el
// color sigue `masEsBueno`, no solo la dirección de la flecha.
export const deltaPct = (actual: number, anterior: number, masEsBueno: boolean): Delta => {
  if (anterior === 0) return { texto: '—', color: 'inherit' };
  const pct = ((actual - anterior) / Math.abs(anterior)) * 100;
  const sube = pct >= 0;
  const bueno = sube === masEsBueno;
  return { texto: `${sube ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}%`, color: pct === 0 ? 'inherit' : bueno ? 'var(--status-ok)' : 'var(--status-error)' };
};

// Para tasas que ya son porcentaje (tasa de ahorro): la diferencia se expresa en
// puntos porcentuales, no como un % relativo del % anterior — confunde menos.
export const deltaPuntos = (actual: number, anterior: number): Delta => {
  const pp = actual - anterior;
  return { texto: `${pp >= 0 ? '▲' : '▼'} ${Math.abs(pp).toFixed(0)}pp`, color: pp >= 0 ? 'var(--status-ok)' : 'var(--status-error)' };
};

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
// Nombres de rubro/tarjeta vienen del usuario y se insertan como HTML (innerHTML) — sin
// esto, un nombre con "<" rompería el layout o (self-XSS) ejecutaría markup.
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);
