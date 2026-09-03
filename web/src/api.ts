// Fase 5 del plan de escalado a usuarios: esta capa habla directo con Supabase
// (PostgREST + RPC) en vez de con la API de Go. Las pantallas (~20 archivos) siguen
// importando estas mismas funciones con las mismas firmas — casi ninguna se enteró
// del cambio. CRUD simple -> PostgREST directo (RLS decide qué se ve, no hay
// backend con privilegios elevados de por medio). Lógica compleja (resumen,
// tendencia*, cronograma MSI) -> funciones de Postgres vía supabase.rpc(...), ver
// supabase/migrations/.
import { supabase } from './supabase';

export interface Aportante {
  usuario_id: string | null;
  nombre: string | null;
  monto: number;
}

export interface RubroResumen {
  id: number;
  nombre: string;
  clasificacion?: 'fijo' | 'discrecional';
  aportaciones: Aportante[];
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
  es_fondo_emergencia?: boolean;
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

export interface FondoEmergencia {
  rubro_id: number;
  saldo: number;
  gasto_fijo_promedio_mensual: number;
  objetivo_min: number;
  objetivo_max: number;
  avance_pct_min?: number;
}

export interface Resumen {
  periodo: string;
  rubros: RubroResumen[];
  ahorro: BolsaAhorro[];
  ingreso_total: number;
  tarjetas: TarjetaSalud[];
  salud: Salud;
  fondo_emergencia?: FondoEmergencia;
  compromiso_msi: { meses: MesMSI[]; total: number };
  pendientes: { gastos_sin_metodo: number; compras_sin_tarjeta: number; gastos_sin_rubro: number; compras_sin_rubro: number };
}

export interface Rubro {
  id: number;
  nombre: string;
  tipo: 'gasto' | 'ahorro';
  monto_objetivo?: number;
  clasificacion?: 'fijo' | 'discrecional';
  es_fondo_emergencia?: boolean;
}

export interface Ingreso {
  id: number;
  fuente: string;
  monto: number;
  periodo: string;
}

export interface Aportacion {
  id: number;
  rubro_id: number;
  usuario_id: string | null;
  monto: number;
  periodo: string;
}

export interface MesTendencia {
  periodo: string;
  ingreso: number;
  gasto_fijo: number;
  gasto_discrecional: number;
  gasto_sin_clasificar: number;
  gasto_total: number;
  tasa_ahorro?: number;
}

export interface PuntoPatrimonio {
  periodo: string;
  monto: number;
}

export interface RubroTendencia {
  rubro_id: number;
  nombre: string;
  montos: number[];
}

export interface TarjetaTendencia {
  id: number;
  nombre: string;
  limite: number;
  pct_utilizacion: number[];
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
  rubro_id: number | null;
  metodo_pago_id: number | null;
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
  tarjeta_id: number | null;
  rubro_id: number | null;
  descripcion: string;
  monto_total: number;
  plazo_meses: number;
  fecha_compra: string;
  cuotas: Cuota[];
}

export interface Perfil {
  id: string;
  hogar_id: number;
  nombre: string;
}

export interface Respaldo {
  version: number;
  generado_en: string;
  metodo_pago: MetodoPago[];
  rubro: Rubro[];
  aportacion: Aportacion[];
  gasto: Gasto[];
  compra_msi: CompraMSI[];
  ingreso: Ingreso[];
}

// Todas las llamadas a Supabase devuelven { data, error } — esto revienta el error
// como excepción (mismo patrón que el req() de fetch que reemplaza) para no repetir
// el chequeo en cada función de abajo.
function ok<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// --- identidad / hogar ---

export const getMiPerfil = async (): Promise<Perfil> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('no autenticado');
  return ok(await supabase.from('perfil').select('*').eq('id', user.id).single());
};

// RLS ya limita esto a "mi hogar" — no hace falta filtrar por hogar_id a mano.
export const getMiembrosHogar = async (): Promise<Perfil[]> =>
  ok(await supabase.from('perfil').select('*').order('nombre')) ?? [];

// --- resumen / tendencia / cronograma MSI (funciones de Postgres) ---

export const getResumen = async (periodo?: string): Promise<Resumen> =>
  ok(await supabase.rpc('resumen', { p_periodo: periodo ?? null }));
export const getTendencia = async (meses?: number): Promise<{ meses: MesTendencia[] }> =>
  ok(await supabase.rpc('tendencia', { p_meses: meses ?? 12 }));
export const getTendenciaRubros = async (meses?: number): Promise<{ meses: string[]; rubros: RubroTendencia[] }> =>
  ok(await supabase.rpc('tendencia_rubros', { p_meses: meses ?? 6 }));
export const getTendenciaTarjetas = async (meses?: number): Promise<{ meses: string[]; tarjetas: TarjetaTendencia[] }> =>
  ok(await supabase.rpc('tendencia_tarjetas', { p_meses: meses ?? 6 }));

export const getPatrimonioHistorico = async (meses?: number): Promise<{ meses: PuntoPatrimonio[] }> => {
  const filas = ok<PuntoPatrimonio[]>(
    await supabase.from('patrimonio_historico').select('periodo, monto').order('periodo', { ascending: false }).limit(meses ?? 12)
  );
  return { meses: filas.slice().reverse() };
};

// --- rubros ---

export const getRubros = async (): Promise<Rubro[]> => ok(await supabase.from('rubro').select('*').order('id'));
export const crearRubro = async (r: Omit<Rubro, 'id'>): Promise<Rubro> => ok(await supabase.from('rubro').insert(r).select().single());
export const actualizarRubro = async (
  id: number,
  r: { nombre: string; monto_objetivo?: number; clasificacion?: 'fijo' | 'discrecional'; es_fondo_emergencia?: boolean }
): Promise<void> => {
  ok(await supabase.from('rubro').update(r).eq('id', id));
};
export const borrarRubro = async (id: number): Promise<void> => {
  ok(await supabase.from('rubro').delete().eq('id', id));
};

// --- métodos de pago ---

export const getMetodos = async (): Promise<MetodoPago[]> => ok(await supabase.from('metodo_pago').select('*').order('id'));
export const crearMetodo = async (m: Omit<MetodoPago, 'id'>): Promise<MetodoPago> =>
  ok(await supabase.from('metodo_pago').insert(m).select().single());
export const actualizarMetodo = async (
  id: number,
  m: { nombre: string; limite?: number; dia_corte?: number; dia_pago?: number }
): Promise<void> => {
  ok(await supabase.from('metodo_pago').update(m).eq('id', id));
};
export const borrarMetodo = async (id: number): Promise<void> => {
  ok(await supabase.from('metodo_pago').delete().eq('id', id));
};

// --- aportaciones ---

export const getAportaciones = async (periodo?: string): Promise<Aportacion[]> => {
  let q = supabase.from('aportacion').select('*');
  if (periodo) q = q.eq('periodo', periodo);
  return ok(await q);
};
export const crearAportacion = async (a: { rubro_id: number; usuario_id: string; monto: number; periodo: string }): Promise<void> => {
  ok(await supabase.from('aportacion').insert(a));
};
export const borrarAportacion = async (id: number): Promise<void> => {
  ok(await supabase.from('aportacion').delete().eq('id', id));
};

// --- gastos ---

export const getGastos = async (): Promise<Gasto[]> =>
  ok(await supabase.from('gasto').select('*').order('fecha', { ascending: false }).order('id', { ascending: false }));
export const crearGasto = async (g: Omit<Gasto, 'id'>): Promise<Gasto> => ok(await supabase.from('gasto').insert(g).select().single());
export const borrarGasto = async (id: number): Promise<void> => {
  ok(await supabase.from('gasto').delete().eq('id', id));
};
export const actualizarGastoMetodo = async (id: number, metodo_pago_id: number): Promise<void> => {
  ok(await supabase.from('gasto').update({ metodo_pago_id }).eq('id', id));
};
export const actualizarGastoRubro = async (id: number, rubro_id: number): Promise<void> => {
  ok(await supabase.from('gasto').update({ rubro_id }).eq('id', id));
};

// --- compras MSI ---

export const crearCompraMSI = async (c: Omit<CompraMSI, 'id' | 'cuotas'>): Promise<CompraMSI> => {
  const id = ok<number>(
    await supabase.rpc('crear_compra_msi', {
      p_tarjeta_id: c.tarjeta_id,
      p_rubro_id: c.rubro_id,
      p_descripcion: c.descripcion,
      p_monto_total: c.monto_total,
      p_plazo_meses: c.plazo_meses,
      p_fecha_compra: c.fecha_compra,
    })
  );
  return ok<CompraMSI>(await supabase.from('compra_msi').select('*, cuotas:cuota_msi(*)').eq('id', id).single());
};
export const getComprasMSI = async (): Promise<CompraMSI[]> =>
  ok(await supabase.from('compra_msi').select('*, cuotas:cuota_msi(*)').order('id'));
export const borrarCompraMSI = async (id: number): Promise<void> => {
  ok(await supabase.from('compra_msi').delete().eq('id', id));
};
export const actualizarCompraTarjeta = async (id: number, tarjeta_id: number): Promise<void> => {
  ok(await supabase.from('compra_msi').update({ tarjeta_id }).eq('id', id));
};
export const actualizarCompraRubro = async (id: number, rubro_id: number): Promise<void> => {
  ok(await supabase.from('compra_msi').update({ rubro_id }).eq('id', id));
};
export const marcarCuota = async (id: number, pagada: boolean): Promise<void> => {
  ok(await supabase.from('cuota_msi').update({ pagada }).eq('id', id));
};

// --- ingresos ---

export const getIngresos = async (periodo?: string): Promise<Ingreso[]> => {
  let q = supabase.from('ingreso').select('*');
  if (periodo) q = q.eq('periodo', periodo);
  return ok(await q);
};
export const crearIngreso = async (i: Omit<Ingreso, 'id'>): Promise<void> => {
  ok(await supabase.from('ingreso').insert(i));
};
export const borrarIngreso = async (id: number): Promise<void> => {
  ok(await supabase.from('ingreso').delete().eq('id', id));
};

// --- datos (respaldo) ---
// A diferencia del backend de Go (una sola transacción TRUNCATE+reinsert), esto
// compone varias llamadas del lado del cliente — más simple, pero ya no es atómico:
// un fallo a medio importar puede dejar datos parciales. Aceptable para una
// herramienta personal de uso poco frecuente; si hace falta la garantía atómica,
// se puede portar a una función de Postgres más adelante (no bloquea el resto).

export const getExport = async (): Promise<Respaldo> => {
  const [metodo_pago, rubro, aportacion, gasto, compra_msi, ingreso] = await Promise.all([
    getMetodos(),
    getRubros(),
    getAportaciones(),
    getGastos(),
    getComprasMSI(),
    getIngresos(),
  ]);
  return { version: 1, generado_en: new Date().toISOString(), metodo_pago, rubro, aportacion, gasto, compra_msi, ingreso };
};

export const importarDatos = async (r: Respaldo): Promise<void> => {
  const hogar = await getMiPerfil().then((p) => p.hogar_id);
  // Solo lo de MI hogar, nunca un TRUNCATE global — a diferencia del Go original,
  // esto es multi-tenant, borrar tiene que quedarse dentro de mis propios datos.
  for (const tabla of ['cuota_msi', 'compra_msi', 'gasto', 'aportacion', 'ingreso', 'rubro', 'metodo_pago']) {
    await supabase.from(tabla).delete().eq('hogar_id', hogar);
  }

  const metodoIds = new Map<number, number>();
  for (const m of r.metodo_pago) {
    const { id, ...body } = m;
    const nuevo = await crearMetodo(body);
    metodoIds.set(id, nuevo.id);
  }
  const rubroIds = new Map<number, number>();
  for (const x of r.rubro) {
    const { id, ...body } = x;
    const nuevo = await crearRubro(body);
    rubroIds.set(id, nuevo.id);
  }
  for (const a of r.aportacion) {
    await supabase.from('aportacion').insert({
      rubro_id: rubroIds.get(a.rubro_id),
      usuario_id: a.usuario_id,
      monto: a.monto,
      periodo: a.periodo,
    });
  }
  for (const g of r.gasto) {
    await supabase.from('gasto').insert({
      rubro_id: g.rubro_id ? rubroIds.get(g.rubro_id) : null,
      metodo_pago_id: g.metodo_pago_id ? metodoIds.get(g.metodo_pago_id) : null,
      monto: g.monto,
      fecha: g.fecha,
      descripcion: g.descripcion,
    });
  }
  for (const c of r.compra_msi) {
    // crear_compra_msi regenera el cronograma (montos/fechas) desde cero — eso es
    // correcto (mismo total, mismo plazo), pero no sabe qué cuotas ya se habían
    // marcado pagadas en el respaldo, así que se restaura aparte por numero_cuota.
    const nueva = await crearCompraMSI({
      tarjeta_id: c.tarjeta_id ? (metodoIds.get(c.tarjeta_id) ?? null) : null,
      rubro_id: c.rubro_id ? (rubroIds.get(c.rubro_id) ?? null) : null,
      descripcion: c.descripcion,
      monto_total: c.monto_total,
      plazo_meses: c.plazo_meses,
      fecha_compra: c.fecha_compra,
    });
    const pagadas = new Set(c.cuotas.filter((q) => q.pagada).map((q) => q.numero_cuota));
    await Promise.all(
      nueva.cuotas.filter((q) => pagadas.has(q.numero_cuota)).map((q) => marcarCuota(q.id, true))
    );
  }
  for (const i of r.ingreso) {
    const { id, ...body } = i;
    await crearIngreso(body);
  }
};
