import { getResumen, getGastos, getMetodos } from '../api';
import { money, esc, fechaCorta } from '../format';
import { iconoRubro } from '../icons';
import { topbarBack } from '../chrome';

export async function renderDetalleRubro(root: HTMLElement, params: URLSearchParams) {
  const id = Number(params.get('id'));
  root.innerHTML = `<div class="screen">${topbarBack('Rubro', '/')}<div class="placeholder">Cargando…</div></div>`;

  const [resumen, gastos, metodos] = await Promise.all([getResumen(), getGastos(), getMetodos()]);
  const r = resumen.rubros.find((x) => x.id === id);
  if (!r) {
    root.innerHTML = `<div class="screen">${topbarBack('Rubro', '/')}<div class="placeholder">No se encontró ese rubro.</div></div>`;
    return;
  }

  const total = r.aportado_yo + r.aportado_pareja;
  const usado = r.gastado + r.cuotas_msi;
  const pct = total > 0 ? Math.min((usado / total) * 100, 100) : 0;
  const movimientos = gastos.filter((g) => g.rubro_id === id);

  const movHtml = movimientos
    .map((g) => {
      const metodo = metodos.find((m) => m.id === g.metodo_pago_id);
      return `
        <div class="mov-item">
          <div class="icono"><i data-lucide="${iconoRubro(r.nombre)}" style="width:17px;height:17px;"></i></div>
          <div class="info">
            <div class="desc">${esc(g.descripcion || '(sin descripción)')}</div>
            <div class="meta">${esc(metodo?.nombre ?? '—')} · ${fechaCorta(g.fecha)}</div>
          </div>
          <span class="monto">${money(g.monto)}</span>
        </div>`;
    })
    .join('');

  root.innerHTML = `
    <div class="screen">
      ${topbarBack(esc(r.nombre), '/')}
      <div class="hero-mini">
        <div class="k">Disponible este mes</div>
        <div class="v">${money(r.disponible)}</div>
        <div class="d">gastado ${money(usado)} de ${money(total)}</div>
        <div class="progress-dark"><div style="width:${pct}%"></div></div>
      </div>
      <div class="stat-pair">
        <div class="stat-box">
          <div class="label">&lt;aportaciones&gt;</div>
          <div class="fila-kv"><span class="k">Tú</span><span class="v">${money(r.aportado_yo)}</span></div>
          <div class="fila-kv"><span class="k">Pareja</span><span class="v">${money(r.aportado_pareja)}</span></div>
          <hr />
          <div class="fila-kv"><span class="k">Total</span><span class="v" style="font-weight:700">${money(total)}</span></div>
        </div>
        <div class="stat-box">
          <div class="label">&lt;gastado&gt;</div>
          <div class="grande">${money(r.gastado)}</div>
          <div class="chico">en ${movimientos.length} movimiento${movimientos.length === 1 ? '' : 's'}</div>
        </div>
      </div>
      <div class="seccion-label"><span>&lt;movimientos&gt;</span></div>
      <div class="rubro-list">${movHtml || '<div class="placeholder">Sin movimientos todavía</div>'}</div>
    </div>
  `;
}
