import { getResumen } from '../api';
import { money, esc, mesLargo } from '../format';
import { iconoRubro } from '../icons';
import { NOMBRE, PAREJA_NOMBRE } from '../config';
import { renderNav } from '../nav';

export async function renderHome(root: HTMLElement) {
  root.innerHTML = `<div class="screen"><div class="placeholder">Cargando…</div></div>`;

  const r = await getResumen();

  const totalDisponible = r.rubros.reduce((s, x) => s + x.disponible, 0);
  const totalAportado = r.rubros.reduce((s, x) => s + x.aportado_yo + x.aportado_pareja, 0);
  const msiEsteMes = r.compromiso_msi.meses.find((m) => m.mes === r.periodo)?.total ?? 0;

  const RANGO = { error: 0, warn: 1, ok: 2 };
  const rubros = r.rubros
    .map((x) => {
      const total = x.aportado_yo + x.aportado_pareja;
      const usado = x.gastado + x.cuotas_msi;
      const pct = total > 0 ? (usado / total) * 100 : 0;
      const estado = pct >= 100 ? 'error' : pct >= 90 ? 'warn' : 'ok';
      return { x, pct, estado, total, usado };
    })
    // Los rubros en problemas (sobrepasado/ajustado) van primero — si no, el más
    // urgente puede quedar enterrado al final de la lista según el orden de alta.
    .sort((a, b) => RANGO[a.estado as keyof typeof RANGO] - RANGO[b.estado as keyof typeof RANGO])
    .map(({ x, pct, estado, total, usado }) => {
      const etiqueta = estado === 'error' ? 'sobrepasado' : estado === 'warn' ? 'ajustado' : '';
      return `
        <a href="#/rubro?id=${x.id}" class="rubro-card ${estado === 'error' ? 'sobrepasado' : ''}" style="text-decoration:none;color:inherit;display:block">
          <div class="fila">
            <div class="icono"><i data-lucide="${iconoRubro(x.nombre)}" style="width:20px;height:20px;"></i></div>
            <div class="info">
              <div class="nombre">${esc(x.nombre)}</div>
              <div class="sub ${estado !== 'ok' ? estado : ''}">${money(usado)} de ${money(total)}${etiqueta ? ` · ${etiqueta}` : ''}</div>
            </div>
            <div class="monto-disp">
              <div class="v ${x.disponible < 0 ? 'error' : ''}">${money(x.disponible)}</div>
              <div class="k">disponible</div>
            </div>
          </div>
          <div class="progress"><div class="${estado !== 'ok' ? estado : ''}" style="width:${Math.min(pct, 100)}%"></div></div>
        </a>`;
    })
    .join('');

  root.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div>
          <div class="label">${mesLargo(r.periodo)}</div>
          <div class="titulo">Hola, ${esc(NOMBRE)}</div>
        </div>
        <div style="display:flex;gap:8px">
          <a href="#/salud" class="icon-btn"><i data-lucide="heart-pulse" style="width:18px;height:18px;"></i></a>
          <a href="#/metodos" class="icon-btn"><i data-lucide="credit-card" style="width:18px;height:18px;"></i></a>
          <div class="bell"><i data-lucide="bell" style="width:19px;height:19px;"></i></div>
        </div>
      </div>

      <a href="#/salud" style="text-decoration:none;color:inherit;display:block">
        <div class="hero-card">
          <div class="etiqueta">Disponible este mes</div>
          <div class="monto">${money(totalDisponible)}</div>
          <div class="detalle">de ${money(totalAportado)} · aportan ${esc(NOMBRE)} y ${esc(PAREJA_NOMBRE)}</div>
          <div class="stats">
            <div class="stat"><div class="k">MSI este mes</div><div class="v">${money(msiEsteMes)}</div></div>
            ${
              r.salud.pct_ingreso_comprometido_msi !== undefined
                ? `<div class="stat"><div class="k">Ingreso comprometido</div><div class="v" style="color:${r.salud.pct_ingreso_comprometido_msi >= 30 ? '#E8867A' : 'inherit'}">${r.salud.pct_ingreso_comprometido_msi.toFixed(0)}%</div></div>`
                : ''
            }
          </div>
        </div>
      </a>

      <div class="seccion-label"><span>&lt;rubros · ${r.periodo}&gt;</span><a href="#/rubro/nuevo" style="display:flex;align-items:center;gap:4px;color:var(--text-accent);font-size:12.5px;font-weight:500;text-decoration:none"><i data-lucide="plus" style="width:14px;height:14px;"></i>Nueva categoría</a></div>
      <div class="rubro-list">${rubros || '<div class="placeholder">Sin rubros todavía</div>'}</div>
    </div>
    ${renderNav('/')}
  `;
}
