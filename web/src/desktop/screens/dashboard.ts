import { getResumen, getTendencia } from '../../api';
import { money, esc, mesLargo, deltaPct, deltaPuntos, type Delta } from '../../format';
import { iconoRubro, refreshIcons } from '../../icons';
import { calcularAlertas, renderAlertasBanner } from '../../alertas';

export async function renderDashboard(root: HTMLElement) {
  root.innerHTML = `<div class="placeholder">Cargando…</div>`;

  const [resumen, tendencia] = await Promise.all([getResumen(), getTendencia(6)]);
  const alertas = calcularAlertas(resumen);

  const mesAct = tendencia.meses[tendencia.meses.length - 1];
  const mesAnt = tendencia.meses[tendencia.meses.length - 2];
  const sinDatoAnterior: Delta = { texto: '—', color: 'inherit' };
  const deltaGasto = mesAnt ? deltaPct(mesAct.gasto_total, mesAnt.gasto_total, false) : sinDatoAnterior;
  const deltaIngreso = mesAnt ? deltaPct(mesAct.ingreso, mesAnt.ingreso, true) : sinDatoAnterior;
  const deltaTasa =
    mesAnt && mesAct.tasa_ahorro !== undefined && mesAnt.tasa_ahorro !== undefined
      ? deltaPuntos(mesAct.tasa_ahorro, mesAnt.tasa_ahorro)
      : sinDatoAnterior;

  const totalDisponible = resumen.rubros.reduce((s, x) => s + x.disponible, 0);
  const totalAportado = resumen.rubros.reduce((s, x) => s + x.aportado_yo + x.aportado_pareja, 0);
  const msiEsteMes = resumen.compromiso_msi.meses.find((m) => m.mes === resumen.periodo)?.total ?? 0;
  const totalAhorro = resumen.ahorro.reduce((s, b) => s + b.saldo, 0);

  const rubrosHtml = resumen.rubros
    .slice()
    .sort((a, b) => a.disponible - b.disponible)
    .slice(0, 8)
    .map(
      (x) => `
      <a href="#/rubro?id=${x.id}" class="rubro-card" style="text-decoration:none;color:inherit;display:block">
        <div class="fila">
          <div class="icono"><i data-lucide="${iconoRubro(x.nombre)}" style="width:18px;height:18px;"></i></div>
          <div class="info"><div class="nombre">${esc(x.nombre)}</div></div>
          <div class="monto-disp"><div class="v ${x.disponible < 0 ? 'error' : ''}">${money(x.disponible)}</div></div>
        </div>
      </a>`
    )
    .join('');

  const ahorroHtml = resumen.ahorro
    .map(
      (b) => `
      <div class="mov-item">
        <div class="icono"><i data-lucide="${iconoRubro(b.nombre)}" style="width:16px;height:16px;"></i></div>
        <div class="info"><div class="desc">${esc(b.nombre)}</div></div>
        <span class="monto">${money(b.saldo)}</span>
      </div>`
    )
    .join('');

  const maxTasa = Math.max(...tendencia.meses.map((m) => Math.abs(m.tasa_ahorro ?? 0)), 10);
  const barrasTendencia = tendencia.meses
    .map((m) => {
      const val = m.tasa_ahorro;
      const alto = val === undefined ? 4 : Math.max(4, Math.round((Math.abs(val) / maxTasa) * 100));
      const color = val === undefined ? 'var(--surface-sunken)' : val < 0 ? 'var(--status-error)' : val < 10 ? 'var(--status-warn)' : 'var(--status-ok)';
      const nombreMes = mesLargo(m.periodo).split(' ')[0].slice(0, 3);
      return `<div class="col"><span class="n">${val === undefined ? '—' : `${val.toFixed(0)}%`}</span><div class="b" style="height:${alto}px;background:${color}"></div><span class="m">${nombreMes}</span></div>`;
    })
    .join('');

  root.innerHTML = `
    <div class="desktop-titulo">Dashboard · ${mesLargo(resumen.periodo)}</div>
    <div class="desktop-grid">
      <div class="desktop-grid full">${renderAlertasBanner(alertas)}</div>

      <div class="stat-box">
        <div class="label">&lt;disponible este mes&gt;</div>
        <div class="grande">${money(totalDisponible)}</div>
        <div class="chico">de ${money(totalAportado)} aportado</div>
      </div>
      <div class="stat-box">
        <div class="label">&lt;patrimonio neto&gt;</div>
        <div class="grande">${money(resumen.salud.patrimonio_neto)}</div>
        <div class="chico">ahorro − compromiso MSI</div>
      </div>
      <div class="stat-box">
        <div class="label">&lt;tasa de ahorro&gt;</div>
        <div class="grande">${resumen.salud.tasa_ahorro !== undefined ? `${resumen.salud.tasa_ahorro.toFixed(0)}%` : '—'}</div>
        <div class="chico">(ingreso − gasto) / ingreso</div>
      </div>
      <div class="stat-box">
        <div class="label">&lt;MSI este mes&gt;</div>
        <div class="grande">${money(msiEsteMes)}</div>
        <div class="chico">${resumen.salud.pct_ingreso_comprometido_msi !== undefined ? `${resumen.salud.pct_ingreso_comprometido_msi.toFixed(0)}% del ingreso` : '—'}</div>
      </div>
      <div class="stat-box">
        <div class="label">&lt;gasto vs. mes pasado&gt;</div>
        <div class="grande" style="color:${deltaGasto.color}">${deltaGasto.texto}</div>
      </div>
      <div class="stat-box">
        <div class="label">&lt;ingreso vs. mes pasado&gt;</div>
        <div class="grande" style="color:${deltaIngreso.color}">${deltaIngreso.texto}</div>
      </div>
      <div class="stat-box">
        <div class="label">&lt;ahorro vs. mes pasado&gt;</div>
        <div class="grande" style="color:${deltaTasa.color}">${deltaTasa.texto}</div>
      </div>

      <div>
        <div class="seccion-label"><span>&lt;rubros más ajustados&gt;</span></div>
        <div class="rubro-list">${rubrosHtml || '<div class="placeholder">Sin rubros todavía</div>'}</div>
      </div>
      <div>
        <div class="seccion-label"><span>&lt;ahorro&gt; · ${money(totalAhorro)}</span></div>
        <div class="rubro-list">${ahorroHtml || '<div class="placeholder">Sin bolsas todavía</div>'}</div>
      </div>
      <div>
        <div class="seccion-label"><span>&lt;tasa de ahorro · ${tendencia.meses.length} meses&gt;</span></div>
        <div class="bar-chart"><div class="cols">${barrasTendencia}</div></div>
      </div>
    </div>
  `;
  refreshIcons();
}
