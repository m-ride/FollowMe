import { getResumen, getComprasMSI, getMetodos, borrarCompraMSI } from '../api';
import { money, mesLargo, esc } from '../format';
import { renderNav } from '../nav';
import { refreshIcons } from '../icons';

export async function renderMSI(root: HTMLElement) {
  root.innerHTML = `<div class="screen"><div class="placeholder">Cargando…</div></div>${renderNav('/msi')}`;

  const [resumen, compras, metodos] = await Promise.all([getResumen(), getComprasMSI(), getMetodos()]);
  const { meses, total } = resumen.compromiso_msi;
  const esteMes = meses.find((m) => m.mes === resumen.periodo)?.total ?? 0;
  const activas = compras.filter((c) => c.cuotas.some((q) => !q.pagada));

  const max = Math.max(...meses.map((m) => m.total), 1);
  const barras = meses
    .map((m, i) => {
      const alto = Math.max(8, Math.round((m.total / max) * 118));
      const color = i < 2 ? 'var(--status-ok)' : i < 4 ? 'var(--teal)' : 'var(--teal-12)';
      const nombreMes = mesLargo(m.mes).split(' ')[0].slice(0, 3);
      return `<div class="col"><span class="n">${(m.total / 100000).toFixed(1)}k</span><div class="b" style="height:${alto}px;background:${color}"></div><span class="m">${nombreMes}</span></div>`;
    })
    .join('');

  const filas = meses
    .map(
      (m) => `
      <div class="mes-row">
        <div><div class="nombre">${esc(mesLargo(m.mes))}</div><div class="detalle">${m.por_tarjeta.map((t) => `${esc(t.nombre)} ${money(t.monto)}`).join(' · ')}</div></div>
        <span class="monto">${money(m.total)}</span>
      </div>`
    )
    .join('');

  const comprasHtml = activas
    .map((c) => {
      const tarjeta = metodos.find((m) => m.id === c.tarjeta_id);
      const pendientes = c.cuotas.filter((q) => !q.pagada).length;
      return `
        <div class="mov-item">
          <div class="icono"><i data-lucide="credit-card" style="width:17px;height:17px;"></i></div>
          <div class="info">
            <div class="desc">${esc(c.descripcion || '(sin descripción)')}</div>
            <div class="meta">${esc(tarjeta?.nombre ?? '—')} · ${pendientes} de ${c.plazo_meses} cuotas pendientes</div>
          </div>
          <span class="monto">${money(c.monto_total)}</span>
          <button type="button" class="icon-btn btn-borrar-compra" data-id="${c.id}" style="width:32px;height:32px;flex-shrink:0"><i data-lucide="trash-2" style="width:15px;height:15px;"></i></button>
        </div>`;
    })
    .join('');

  root.innerHTML = `
    <div class="screen">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 4px 0">
        <div>
          <div class="label" style="font-family:var(--font-mono);font-size:11px;letter-spacing:0.06em;color:var(--text-muted)">meses sin intereses</div>
          <div style="font-family:var(--font-display);font-weight:700;font-size:24px;letter-spacing:-0.02em;margin-top:2px">Compromiso MSI</div>
        </div>
        <a href="#/msi/nuevo" class="icon-btn oscuro"><i data-lucide="plus" style="width:20px;height:20px;"></i></a>
      </div>
      <div class="hero-mini" style="margin-top:var(--space-4)">
        <div class="k">Pendiente total</div>
        <div class="v">${money(total)}</div>
        <div class="stat-row">
          <div class="stat"><div class="k">Este mes</div><div class="v">${money(esteMes)}</div></div>
          <div class="stat"><div class="k">Compras activas</div><div class="v">${activas.length}</div></div>
        </div>
      </div>
      <div class="seccion-label"><span>&lt;próximos ${meses.length} meses&gt;</span></div>
      <div class="bar-chart"><div class="cols">${barras || '<div class="placeholder">Sin compromisos</div>'}</div></div>
      <div class="rubro-list" style="margin-top:var(--space-4)">${filas || ''}</div>
      <div class="seccion-label"><span>&lt;tus compras&gt;</span></div>
      <div class="rubro-list">${comprasHtml || '<div class="placeholder">Sin compras a meses todavía</div>'}</div>
    </div>
    ${renderNav('/msi')}
  `;
  refreshIcons();

  root.querySelectorAll<HTMLButtonElement>('.btn-borrar-compra').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Borrar esta compra y sus cuotas?')) return;
      await borrarCompraMSI(Number(btn.dataset.id));
      await renderMSI(root);
    });
  });
}
