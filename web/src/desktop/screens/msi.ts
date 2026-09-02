import { getComprasMSI, getMetodos, getRubros, borrarCompraMSI, type CompraMSI } from '../../api';
import { money, esc, fechaCorta } from '../../format';
import { renderTabla, activarOrden, type Columna } from '../tabla';
import { refreshIcons } from '../../icons';

interface FilaCompra {
  compra: CompraMSI;
  tarjeta: string;
  rubro: string;
  pendientes: number;
  proximoVencimiento: string;
}

export async function renderMSIEscritorio(root: HTMLElement) {
  root.innerHTML = `<div class="placeholder">Cargando…</div>`;

  const [compras, metodos, rubros] = await Promise.all([getComprasMSI(), getMetodos(), getRubros()]);
  const nombreMetodo = (id: number | null) => metodos.find((m) => m.id === id)?.nombre ?? '—';
  const nombreRubro = (id: number | null) => rubros.find((r) => r.id === id)?.nombre ?? '—';

  const filas: FilaCompra[] = compras.map((c) => {
    const pendientes = c.cuotas.filter((q) => !q.pagada);
    const proximo = pendientes.map((q) => q.fecha_vencimiento).sort()[0] ?? '';
    return { compra: c, tarjeta: nombreMetodo(c.tarjeta_id), rubro: nombreRubro(c.rubro_id), pendientes: pendientes.length, proximoVencimiento: proximo };
  });

  const columnas: Columna<FilaCompra>[] = [
    { clave: 'descripcion', etiqueta: 'Compra', valor: (f) => esc(f.compra.descripcion || '(sin descripción)') },
    { clave: 'tarjeta', etiqueta: 'Tarjeta', valor: (f) => esc(f.tarjeta) },
    {
      clave: 'rubro',
      etiqueta: 'Rubro',
      valor: (f) => (f.compra.rubro_id !== null ? `<a href="#/rubro?id=${f.compra.rubro_id}">${esc(f.rubro)}</a>` : `<a href="#/pendientes">${esc(f.rubro)}</a>`),
    },
    { clave: 'monto_total', etiqueta: 'Monto total', num: true, valor: (f) => money(f.compra.monto_total), orden: (f) => f.compra.monto_total },
    { clave: 'pendientes', etiqueta: 'Cuotas', valor: (f) => `${f.compra.plazo_meses - f.pendientes}/${f.compra.plazo_meses}`, orden: (f) => f.pendientes },
    { clave: 'proximo', etiqueta: 'Próximo vencimiento', valor: (f) => (f.proximoVencimiento ? fechaCorta(f.proximoVencimiento) : 'liquidada'), orden: (f) => f.proximoVencimiento || '9999' },
    {
      clave: 'acciones',
      etiqueta: '',
      valor: (f) => `<button type="button" class="icon-btn btn-borrar-compra" data-id="${f.compra.id}"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>`,
    },
  ];

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="desktop-titulo" style="margin-bottom:0">Compras a meses (MSI)</div>
      <a href="#/msi/nuevo" class="btn-fantasma" style="width:auto;padding:8px 16px"><i data-lucide="plus" style="width:16px;height:16px;"></i>Nueva compra</a>
    </div>
    <div id="tabla-contenedor" style="margin-top:var(--space-4)"></div>
  `;
  const contenedor = root.querySelector<HTMLDivElement>('#tabla-contenedor')!;
  contenedor.innerHTML = renderTabla(columnas, filas, 'tabla-msi');
  activarOrden(root, 'tabla-msi', columnas, filas);
  refreshIcons();

  root.querySelectorAll<HTMLButtonElement>('.btn-borrar-compra').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Borrar esta compra y sus cuotas?')) return;
      await borrarCompraMSI(Number(btn.dataset.id));
      renderMSIEscritorio(root);
    });
  });
}
