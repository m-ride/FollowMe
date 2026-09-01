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

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
// Nombres de rubro/tarjeta vienen del usuario y se insertan como HTML (innerHTML) — sin
// esto, un nombre con "<" rompería el layout o (self-XSS) ejecutaría markup.
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);
