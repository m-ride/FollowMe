const mxn = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

// El backend maneja todo en centavos (enteros); esto muestra pesos enteros.
export const money = (cents: number): string => `$${mxn.format(cents / 100)}`;

export const fechaCorta = (iso: string): string =>
  new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(`${iso}T00:00:00`));

export const mesCorto = (periodo: string): string =>
  new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric' }).format(new Date(`${periodo}-01T00:00:00`));

export const mesLargo = (periodo: string): string => {
  const mes = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(new Date(`${periodo}-01T00:00:00`));
  return `${mes} ${periodo.slice(0, 4)}`;
};

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
// Nombres de rubro/tarjeta vienen del usuario y se insertan como HTML (innerHTML) — sin
// esto, un nombre con "<" rompería el layout o (self-XSS) ejecutaría markup.
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);
