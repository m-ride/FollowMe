import { getGastos, getAportaciones, getIngresos, getComprasMSI, getRubros, getMetodos } from '../../api';
import { money, esc, fechaCorta } from '../../format';
import { renderTabla, activarOrden, type Columna } from '../tabla';
import { refreshIcons } from '../../icons';

interface FilaMov {
  tipo: 'gasto' | 'aportación' | 'ingreso' | 'cuota MSI';
  fecha: string;
  rubro: string;
  detalle: string;
  monto: number;
  href?: string;
}

export async function renderMovimientos(root: HTMLElement) {
  root.innerHTML = `<div class="placeholder">Cargando…</div>`;

  const [gastos, aportaciones, ingresos, compras, rubros, metodos] = await Promise.all([
    getGastos(),
    getAportaciones(),
    getIngresos(),
    getComprasMSI(),
    getRubros(),
    getMetodos(),
  ]);
  const nombreRubro = (id: number | null) => rubros.find((r) => r.id === id)?.nombre ?? '—';
  const nombreMetodo = (id: number | null) => metodos.find((m) => m.id === id)?.nombre ?? '—';

  const filas: FilaMov[] = [
    ...gastos.map((g): FilaMov => ({
      tipo: 'gasto',
      fecha: g.fecha,
      rubro: nombreRubro(g.rubro_id),
      detalle: `${nombreMetodo(g.metodo_pago_id)} · ${g.descripcion || '(sin descripción)'}`,
      monto: -g.monto,
      href: g.rubro_id !== null ? `#/rubro?id=${g.rubro_id}` : '#/pendientes',
    })),
    ...aportaciones.map((a): FilaMov => ({
      tipo: 'aportación',
      fecha: `${a.periodo}-01`,
      rubro: nombreRubro(a.rubro_id),
      detalle: a.fuente === 'yo' ? 'Tú' : 'Pareja',
      monto: a.monto,
    })),
    ...ingresos.map((i): FilaMov => ({
      tipo: 'ingreso',
      fecha: `${i.periodo}-01`,
      rubro: '—',
      detalle: i.fuente,
      monto: i.monto,
    })),
    ...compras.flatMap((c) =>
      c.cuotas
        .filter((q) => q.pagada)
        .map((q): FilaMov => ({
          tipo: 'cuota MSI',
          fecha: q.fecha_vencimiento,
          rubro: nombreRubro(c.rubro_id),
          detalle: `Cuota ${q.numero_cuota}/${c.plazo_meses} · ${c.descripcion || '(sin descripción)'}`,
          monto: -q.monto,
          href: c.rubro_id !== null ? `#/rubro?id=${c.rubro_id}` : '#/pendientes',
        }))
    ),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const tiposUnicos = ['gasto', 'aportación', 'ingreso', 'cuota MSI'];
  const rubrosUnicos = [...new Set(filas.map((f) => f.rubro))].sort();

  const columnas: Columna<FilaMov>[] = [
    { clave: 'fecha', etiqueta: 'Fecha', valor: (f) => fechaCorta(f.fecha), orden: (f) => f.fecha },
    { clave: 'tipo', etiqueta: 'Tipo', valor: (f) => esc(f.tipo) },
    { clave: 'rubro', etiqueta: 'Rubro', valor: (f) => (f.href ? `<a href="${f.href}">${esc(f.rubro)}</a>` : esc(f.rubro)) },
    { clave: 'detalle', etiqueta: 'Detalle', valor: (f) => esc(f.detalle) },
    { clave: 'monto', etiqueta: 'Monto', num: true, valor: (f) => money(f.monto), orden: (f) => f.monto },
  ];

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="desktop-titulo" style="margin-bottom:0">Movimientos</div>
      <a href="#/gastos/nuevo" class="btn-fantasma" style="width:auto;padding:8px 16px"><i data-lucide="plus" style="width:16px;height:16px;"></i>Nuevo</a>
    </div>
    <div class="tabla-filtros" style="margin-top:var(--space-4)">
      <select id="f-tipo"><option value="">Todos los tipos</option>${tiposUnicos.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}</select>
      <select id="f-rubro"><option value="">Todos los rubros</option>${rubrosUnicos.map((r) => `<option value="${esc(r)}">${esc(r)}</option>`).join('')}</select>
      <input type="month" id="f-mes" />
      <span class="chico" id="f-resumen"></span>
    </div>
    <div id="tabla-contenedor"></div>
  `;

  const contenedor = root.querySelector<HTMLDivElement>('#tabla-contenedor')!;
  const resumenEl = root.querySelector<HTMLSpanElement>('#f-resumen')!;

  function pintar() {
    const tipo = root.querySelector<HTMLSelectElement>('#f-tipo')!.value;
    const rubro = root.querySelector<HTMLSelectElement>('#f-rubro')!.value;
    const mes = root.querySelector<HTMLInputElement>('#f-mes')!.value;
    const filtradas = filas.filter(
      (f) => (!tipo || f.tipo === tipo) && (!rubro || f.rubro === rubro) && (!mes || f.fecha.startsWith(mes))
    );
    resumenEl.textContent = `${filtradas.length} movimiento${filtradas.length === 1 ? '' : 's'} · neto ${money(filtradas.reduce((s, f) => s + f.monto, 0))}`;
    contenedor.innerHTML = renderTabla(columnas, filtradas, 'tabla-movimientos');
    activarOrden(root, 'tabla-movimientos', columnas, filtradas);
  }

  pintar();
  root.querySelector('#f-tipo')!.addEventListener('change', pintar);
  root.querySelector('#f-rubro')!.addEventListener('change', pintar);
  root.querySelector('#f-mes')!.addEventListener('change', pintar);
  refreshIcons();
}
