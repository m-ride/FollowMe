import { getGastos, getAportaciones, getIngresos, getRubros, getMetodos } from './api';

export function descargar(contenido: string, nombre: string, tipo: string) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

const csvCelda = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

// Un solo CSV con columna "tipo" en vez de tres archivos — más fácil de tabular/
// filtrar en Excel que cruzar varias hojas.
export async function exportarMovimientosCSV() {
  const [gastos, aportaciones, ingresos, rubros, metodos] = await Promise.all([
    getGastos(),
    getAportaciones(),
    getIngresos(),
    getRubros(),
    getMetodos(),
  ]);
  const nombreRubro = (id: number) => rubros.find((r) => r.id === id)?.nombre ?? '';
  const nombreMetodo = (id: number) => metodos.find((m) => m.id === id)?.nombre ?? '';

  const filas: string[][] = [['tipo', 'fecha_o_periodo', 'rubro', 'metodo_pago', 'fuente', 'monto_pesos', 'descripcion']];
  for (const g of gastos) {
    filas.push(['gasto', g.fecha, nombreRubro(g.rubro_id), nombreMetodo(g.metodo_pago_id), '', (g.monto / 100).toFixed(2), g.descripcion]);
  }
  for (const a of aportaciones) {
    filas.push(['aportacion', a.periodo, nombreRubro(a.rubro_id), '', a.fuente, (a.monto / 100).toFixed(2), '']);
  }
  for (const i of ingresos) {
    filas.push(['ingreso', i.periodo, '', '', i.fuente, (i.monto / 100).toFixed(2), '']);
  }

  const csv = filas.map((f) => f.map(csvCelda).join(',')).join('\n');
  descargar(csv, `followme-movimientos-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
}
