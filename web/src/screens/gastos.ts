import { getGastos, getRubros, getMetodos } from '../api';
import { money, esc, fechaCorta } from '../format';
import { iconoRubro } from '../icons';
import { renderNav } from '../nav';

export async function renderGastos(root: HTMLElement) {
  root.innerHTML = `<div class="screen"><div class="placeholder">Cargando…</div></div>${renderNav('/gastos')}`;

  const [gastos, rubros, metodos] = await Promise.all([getGastos(), getRubros(), getMetodos()]);
  const total = gastos.reduce((s, g) => s + g.monto, 0);

  const filas = gastos
    .map((g) => {
      const rubro = rubros.find((r) => r.id === g.rubro_id);
      const metodo = metodos.find((m) => m.id === g.metodo_pago_id);
      return `
        <a href="#/rubro?id=${g.rubro_id}" class="mov-item" style="text-decoration:none;color:inherit">
          <div class="icono"><i data-lucide="${iconoRubro(rubro?.nombre ?? '')}" style="width:17px;height:17px;"></i></div>
          <div class="info">
            <div class="desc">${esc(g.descripcion || '(sin descripción)')}</div>
            <div class="meta">${esc(rubro?.nombre ?? '—')} · ${esc(metodo?.nombre ?? '—')} · ${fechaCorta(g.fecha)}</div>
          </div>
          <span class="monto">${money(g.monto)}</span>
        </a>`;
    })
    .join('');

  root.innerHTML = `
    <div class="screen">
      <div style="padding:8px 4px 0">
        <div style="font-family:var(--font-mono);font-size:11px;letter-spacing:0.06em;color:var(--text-muted)">${gastos.length} movimiento${gastos.length === 1 ? '' : 's'}</div>
        <div style="font-family:var(--font-display);font-weight:700;font-size:24px;letter-spacing:-0.02em;margin-top:2px">Gastos</div>
      </div>
      <div class="hero-mini" style="margin-top:var(--space-4)">
        <div class="k">Gastado en total</div>
        <div class="v">${money(total)}</div>
      </div>
      <div class="rubro-list" style="margin-top:var(--space-4)">${filas || '<div class="placeholder">Sin gastos todavía</div>'}</div>
    </div>
    ${renderNav('/gastos')}
  `;
}
