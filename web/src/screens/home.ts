import { getResumen, getTendencia, getMiPerfil, getMiembrosHogar } from '../api';
import { money, esc, mesLargo, listaNombres, deltaPct, deltaPuntos, type Delta } from '../format';
import { iconoRubro } from '../icons';
import { renderNav } from '../nav';
import { calcularAlertas, renderAlertasBanner, UMBRAL_RUBRO_WARN, UMBRAL_RUBRO_ERROR, UMBRAL_MSI_ERROR } from '../alertas';

export async function renderHome(root: HTMLElement) {
  root.innerHTML = `<div class="screen"><div class="placeholder">Cargando…</div></div>`;

  const [r, tendencia, yo, hogar] = await Promise.all([getResumen(), getTendencia(2), getMiPerfil(), getMiembrosHogar()]);
  const [mesAnt, mesAct] = tendencia.meses;

  const sinDatoAnterior: Delta = { texto: '—', color: 'inherit' };
  const deltaGasto = mesAnt ? deltaPct(mesAct.gasto_total, mesAnt.gasto_total, false) : sinDatoAnterior;
  const deltaIngreso = mesAnt ? deltaPct(mesAct.ingreso, mesAnt.ingreso, true) : sinDatoAnterior;
  const deltaTasa =
    mesAnt && mesAct.tasa_ahorro !== undefined && mesAnt.tasa_ahorro !== undefined
      ? deltaPuntos(mesAct.tasa_ahorro, mesAnt.tasa_ahorro)
      : sinDatoAnterior;

  const totalDisponible = r.rubros.reduce((s, x) => s + x.disponible, 0);
  const totalAportado = r.rubros.reduce((s, x) => s + x.aportaciones.reduce((s2, a) => s2 + a.monto, 0), 0);
  const msiEsteMes = r.compromiso_msi.meses.find((m) => m.mes === r.periodo)?.total ?? 0;

  const RANGO = { error: 0, warn: 1, ok: 2 };
  const rubros = r.rubros
    .map((x) => {
      const total = x.aportaciones.reduce((s, a) => s + a.monto, 0);
      const usado = x.gastado + x.cuotas_msi;
      const pct = total > 0 ? (usado / total) * 100 : 0;
      const estado = pct >= UMBRAL_RUBRO_ERROR ? 'error' : pct >= UMBRAL_RUBRO_WARN ? 'warn' : 'ok';
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

  const alertas = calcularAlertas(r);

  root.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <div>
          <div class="label">${mesLargo(r.periodo)}</div>
          <div class="titulo">Hola, ${esc(yo.nombre)}</div>
        </div>
        <div style="display:flex;gap:8px">
          <a href="#/salud" class="icon-btn"><i data-lucide="heart-pulse" style="width:18px;height:18px;"></i></a>
          <a href="#/metodos" class="icon-btn"><i data-lucide="credit-card" style="width:18px;height:18px;"></i></a>
          <a href="#/datos" class="icon-btn"><i data-lucide="download" style="width:18px;height:18px;"></i></a>
          <div class="bell"><i data-lucide="bell" style="width:19px;height:19px;"></i></div>
        </div>
      </div>

      ${renderAlertasBanner(alertas)}

      <a href="#/salud" style="text-decoration:none;color:inherit;display:block">
        <div class="hero-card">
          <div class="etiqueta">Disponible este mes</div>
          <div class="monto">${money(totalDisponible)}</div>
          <div class="detalle">de ${money(totalAportado)} · aportan ${esc(listaNombres(hogar.map((p) => p.nombre)))}</div>
          <div class="stats">
            <div class="stat"><div class="k">MSI este mes</div><div class="v">${money(msiEsteMes)}</div></div>
            ${
              r.salud.pct_ingreso_comprometido_msi !== undefined
                ? `<div class="stat"><div class="k">Ingreso comprometido</div><div class="v" style="color:${r.salud.pct_ingreso_comprometido_msi >= UMBRAL_MSI_ERROR ? '#E8867A' : 'inherit'}">${r.salud.pct_ingreso_comprometido_msi.toFixed(0)}%</div></div>`
                : ''
            }
          </div>
          <div class="stat-row">
            <div class="stat"><div class="k">Gasto vs. mes pasado</div><div class="v" style="color:${deltaGasto.color}">${deltaGasto.texto}</div></div>
            <div class="stat"><div class="k">Ingreso vs. mes pasado</div><div class="v" style="color:${deltaIngreso.color}">${deltaIngreso.texto}</div></div>
            <div class="stat"><div class="k">Ahorro vs. mes pasado</div><div class="v" style="color:${deltaTasa.color}">${deltaTasa.texto}</div></div>
          </div>
        </div>
      </a>

      <div class="seccion-label"><span>&lt;rubros · ${r.periodo}&gt;</span><a href="#/rubro/nuevo" style="display:flex;align-items:center;gap:4px;color:var(--text-accent);font-size:12.5px;font-weight:500;text-decoration:none"><i data-lucide="plus" style="width:14px;height:14px;"></i>Nueva categoría</a></div>
      <div class="rubro-list">${rubros || '<div class="placeholder">Sin rubros todavía</div>'}</div>
    </div>
    ${renderNav('/')}
  `;
}
