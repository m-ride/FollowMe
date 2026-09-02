import {
  getGastos,
  getComprasMSI,
  getMetodos,
  getRubros,
  actualizarGastoMetodo,
  actualizarGastoRubro,
  actualizarCompraTarjeta,
  actualizarCompraRubro,
} from '../api';
import { money, esc, fechaCorta } from '../format';
import { iconoRubro, refreshIcons } from '../icons';
import { topbarBack } from '../chrome';

export async function renderPendientes(root: HTMLElement) {
  root.innerHTML = `<div class="screen">${topbarBack('Pendientes', '/')}<div class="placeholder">Cargando…</div></div>`;

  const [gastos, compras, metodos, rubros] = await Promise.all([getGastos(), getComprasMSI(), getMetodos(), getRubros()]);
  const rubrosGasto = rubros.filter((r) => r.tipo === 'gasto');
  const tarjetas = metodos.filter((m) => m.tipo === 'credito');
  const nombreRubro = (id: number | null) => rubros.find((r) => r.id === id)?.nombre ?? '—';

  const gastosPend = gastos.filter((g) => g.metodo_pago_id === null || g.rubro_id === null);
  const comprasPend = compras.filter((c) => c.tarjeta_id === null || c.rubro_id === null);

  const selector = (id: string, lista: { id: number; nombre: string }[]) =>
    `<div class="select-wrap" style="flex:1"><select id="${id}">${lista
      .map((m) => `<option value="${m.id}">${esc(m.nombre)}</option>`)
      .join('')}</select><i data-lucide="chevron-down" style="width:16px;height:16px;"></i></div>`;

  const filaGasto = (g: (typeof gastosPend)[number]) => `
    <div class="metodo-card simple" data-fila-gasto="${g.id}">
      <div class="fila">
        <div class="icono"><i data-lucide="${iconoRubro(nombreRubro(g.rubro_id))}" style="width:17px;height:17px;"></i></div>
        <div class="info">
          <div class="nombre">${esc(g.descripcion || '(sin descripción)')}</div>
          <div class="sub">${esc(nombreRubro(g.rubro_id))} · ${fechaCorta(g.fecha)} · ${money(g.monto)}</div>
        </div>
      </div>
      ${
        g.rubro_id === null
          ? `<div class="inline-form" style="display:flex;gap:8px;align-items:flex-end">
               ${selector(`sel-gasto-rubro-${g.id}`, rubrosGasto)}
               <button type="button" class="btn-primario btn-asignar-gasto-rubro" data-id="${g.id}" style="width:auto;padding:10px 16px">Asignar rubro</button>
             </div>`
          : ''
      }
      ${
        g.metodo_pago_id === null
          ? `<div class="inline-form" style="display:flex;gap:8px;align-items:flex-end">
               ${selector(`sel-gasto-metodo-${g.id}`, metodos)}
               <button type="button" class="btn-primario btn-asignar-gasto-metodo" data-id="${g.id}" style="width:auto;padding:10px 16px">Asignar método</button>
             </div>`
          : ''
      }
    </div>`;

  const filaCompra = (c: (typeof comprasPend)[number]) => `
    <div class="metodo-card simple" data-fila-compra="${c.id}">
      <div class="fila">
        <div class="icono"><i data-lucide="${iconoRubro(nombreRubro(c.rubro_id))}" style="width:17px;height:17px;"></i></div>
        <div class="info">
          <div class="nombre">${esc(c.descripcion || '(sin descripción)')}</div>
          <div class="sub">${esc(nombreRubro(c.rubro_id))} · ${fechaCorta(c.fecha_compra)} · ${money(c.monto_total)} a ${c.plazo_meses} meses</div>
        </div>
      </div>
      ${
        c.rubro_id === null
          ? `<div class="inline-form" style="display:flex;gap:8px;align-items:flex-end">
               ${selector(`sel-compra-rubro-${c.id}`, rubrosGasto)}
               <button type="button" class="btn-primario btn-asignar-compra-rubro" data-id="${c.id}" style="width:auto;padding:10px 16px">Asignar rubro</button>
             </div>`
          : ''
      }
      ${
        c.tarjeta_id === null
          ? tarjetas.length > 0
            ? `<div class="inline-form" style="display:flex;gap:8px;align-items:flex-end">
                 ${selector(`sel-compra-tarjeta-${c.id}`, tarjetas)}
                 <button type="button" class="btn-primario btn-asignar-compra-tarjeta" data-id="${c.id}" style="width:auto;padding:10px 16px">Asignar tarjeta</button>
               </div>`
            : '<div class="error-msg" style="display:block">No tienes tarjetas de crédito registradas.</div>'
          : ''
      }
    </div>`;

  const vacio = gastosPend.length === 0 && comprasPend.length === 0;

  root.innerHTML = `
    <div class="screen">
      ${topbarBack('Pendientes', '/')}
      ${
        vacio
          ? '<div class="placeholder">Nada pendiente — todo tiene rubro y método de pago asignado.</div>'
          : `
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:var(--space-4)">
          Estos movimientos se quedaron sin rubro o método de pago porque el original se borró. Asígnales uno nuevo.
        </div>
        ${gastosPend.length > 0 ? `<div class="seccion-label"><span>&lt;gastos&gt;</span></div><div class="rubro-list">${gastosPend.map(filaGasto).join('')}</div>` : ''}
        ${comprasPend.length > 0 ? `<div class="seccion-label"><span>&lt;compras msi&gt;</span></div><div class="rubro-list">${comprasPend.map(filaCompra).join('')}</div>` : ''}
      `
      }
    </div>
  `;
  refreshIcons();

  const asignar = async (accion: () => Promise<void>) => {
    try {
      await accion();
      await renderPendientes(root);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  root.querySelectorAll<HTMLButtonElement>('.btn-asignar-gasto-rubro').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const rubroId = Number((root.querySelector<HTMLSelectElement>(`#sel-gasto-rubro-${id}`)!).value);
      asignar(() => actualizarGastoRubro(id, rubroId));
    });
  });
  root.querySelectorAll<HTMLButtonElement>('.btn-asignar-gasto-metodo').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const metodoId = Number((root.querySelector<HTMLSelectElement>(`#sel-gasto-metodo-${id}`)!).value);
      asignar(() => actualizarGastoMetodo(id, metodoId));
    });
  });
  root.querySelectorAll<HTMLButtonElement>('.btn-asignar-compra-rubro').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const rubroId = Number((root.querySelector<HTMLSelectElement>(`#sel-compra-rubro-${id}`)!).value);
      asignar(() => actualizarCompraRubro(id, rubroId));
    });
  });
  root.querySelectorAll<HTMLButtonElement>('.btn-asignar-compra-tarjeta').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const tarjetaId = Number((root.querySelector<HTMLSelectElement>(`#sel-compra-tarjeta-${id}`)!).value);
      asignar(() => actualizarCompraTarjeta(id, tarjetaId));
    });
  });
}
