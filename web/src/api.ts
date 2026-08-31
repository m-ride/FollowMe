import { API_URL, getToken, clearToken } from './config';

export interface RubroResumen {
  id: number;
  nombre: string;
  clasificacion?: 'fijo' | 'discrecional';
  aportado_yo: number;
  aportado_pareja: number;
  gastado: number;
  cuotas_msi: number;
  disponible: number;
}

export interface TarjetaSalud {
  id: number;
  nombre: string;
  limite: number;
  saldo_actual: number;
  pct_utilizacion: number;
}

export interface Salud {
  tasa_ahorro?: number;
  pct_ingreso_comprometido_msi?: number;
  patrimonio_neto: number;
  gasto_fijo: number;
  gasto_discrecional: number;
  gasto_sin_clasificar: number;
}

export interface BolsaAhorro {
  id: number;
  nombre: string;
  saldo: number;
  monto_objetivo?: number;
  avance_pct?: number;
}

export interface CompromisoTarjeta {
  tarjeta_id: number;
  nombre: string;
  monto: number;
}

export interface MesMSI {
  mes: string;
  total: number;
  por_tarjeta: CompromisoTarjeta[];
}

export interface Resumen {
  periodo: string;
  rubros: RubroResumen[];
  ahorro: BolsaAhorro[];
  ingreso_total: number;
  tarjetas: TarjetaSalud[];
  salud: Salud;
  compromiso_msi: { meses: MesMSI[]; total: number };
}

export interface Rubro {
  id: number;
  nombre: string;
  tipo: 'gasto' | 'ahorro';
  monto_objetivo?: number;
  clasificacion?: 'fijo' | 'discrecional';
}

export interface Ingreso {
  id: number;
  fuente: string;
  monto: number;
  periodo: string;
}

export interface MetodoPago {
  id: number;
  nombre: string;
  tipo: 'efectivo' | 'debito' | 'credito';
  limite?: number;
  dia_corte?: number;
  dia_pago?: number;
}

export interface Gasto {
  id: number;
  rubro_id: number;
  metodo_pago_id: number;
  monto: number;
  fecha: string;
  descripcion: string;
}

export interface Cuota {
  id: number;
  compra_id: number;
  numero_cuota: number;
  monto: number;
  fecha_vencimiento: string;
  pagada: boolean;
}

export interface CompraMSI {
  id: number;
  tarjeta_id: number;
  rubro_id: number;
  descripcion: string;
  monto_total: number;
  plazo_meses: number;
  fecha_compra: string;
  cuotas: Cuota[];
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken() ?? ''}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) {
    // El token guardado ya no sirve (nunca fue válido, o lo rotaron) — de vuelta al candado.
    clearToken();
    location.reload();
    throw new Error('no autorizado');
  }
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? (undefined as T) : res.json();
}

const get = <T>(path: string) => req<T>(path);
const post = <T>(path: string, body: unknown) => req<T>(path, { method: 'POST', body: JSON.stringify(body) });
const patch = (path: string, body: unknown) => req<void>(path, { method: 'PATCH', body: JSON.stringify(body) });
const del = (path: string) => req<void>(path, { method: 'DELETE' });

export const getResumen = (periodo?: string) => get<Resumen>(`resumen${periodo ? `?periodo=${periodo}` : ''}`);
export const getRubros = () => get<Rubro[]>('rubros');
export const crearRubro = (r: Omit<Rubro, 'id'>) => post<Rubro>('rubros', r);
export const actualizarRubro = (
  id: number,
  r: { nombre: string; monto_objetivo?: number; clasificacion?: 'fijo' | 'discrecional' }
) => patch(`rubros/${id}`, r);
export const getMetodos = () => get<MetodoPago[]>('metodos-pago');
export const crearMetodo = (m: Omit<MetodoPago, 'id'>) => post<MetodoPago>('metodos-pago', m);
export const actualizarMetodo = (
  id: number,
  m: { nombre: string; limite?: number; dia_corte?: number; dia_pago?: number }
) => patch(`metodos-pago/${id}`, m);
export const crearAportacion = (a: { rubro_id: number; fuente: 'yo' | 'pareja'; monto: number; periodo: string }) =>
  post('aportaciones', a);
export const borrarAportacion = (id: number) => del(`aportaciones/${id}`);
export const getGastos = (periodo?: string) => get<Gasto[]>(`gastos${periodo ? `?periodo=${periodo}` : ''}`);
export const crearGasto = (g: Omit<Gasto, 'id'>) => post<Gasto>('gastos', g);
export const borrarGasto = (id: number) => del(`gastos/${id}`);
export const crearCompraMSI = (
  c: Omit<CompraMSI, 'id' | 'cuotas'>
) => post<CompraMSI>('compras-msi', c);
export const getComprasMSI = () => get<CompraMSI[]>('compras-msi');
export const borrarCompraMSI = (id: number) => del(`compras-msi/${id}`);
export const getIngresos = (periodo?: string) => get<Ingreso[]>(`ingresos${periodo ? `?periodo=${periodo}` : ''}`);
export const crearIngreso = (i: Omit<Ingreso, 'id'>) => post<Ingreso>('ingresos', i);
export const borrarIngreso = (id: number) => del(`ingresos/${id}`);
