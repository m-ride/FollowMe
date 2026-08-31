import { API_URL, APP_TOKEN } from './config';

export interface RubroResumen {
  id: number;
  nombre: string;
  aportado_yo: number;
  aportado_pareja: number;
  gastado: number;
  cuotas_msi: number;
  disponible: number;
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
  compromiso_msi: { meses: MesMSI[]; total: number };
}

export interface Rubro {
  id: number;
  nombre: string;
  tipo: 'gasto' | 'ahorro';
  monto_objetivo?: number;
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
      Authorization: `Bearer ${APP_TOKEN}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? (undefined as T) : res.json();
}

const get = <T>(path: string) => req<T>(path);
const post = <T>(path: string, body: unknown) => req<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const getResumen = (periodo?: string) => get<Resumen>(`resumen${periodo ? `?periodo=${periodo}` : ''}`);
export const getRubros = () => get<Rubro[]>('rubros');
export const getMetodos = () => get<MetodoPago[]>('metodos-pago');
export const crearMetodo = (m: Omit<MetodoPago, 'id'>) => post<MetodoPago>('metodos-pago', m);
export const crearAportacion = (a: { rubro_id: number; fuente: 'yo' | 'pareja'; monto: number; periodo: string }) =>
  post('aportaciones', a);
export const getGastos = (periodo?: string) => get<Gasto[]>(`gastos${periodo ? `?periodo=${periodo}` : ''}`);
export const crearGasto = (g: Omit<Gasto, 'id'>) => post<Gasto>('gastos', g);
export const crearCompraMSI = (
  c: Omit<CompraMSI, 'id' | 'cuotas'>
) => post<CompraMSI>('compras-msi', c);
export const getComprasMSI = () => get<CompraMSI[]>('compras-msi');
