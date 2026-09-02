import {
  getResumen,
  getIngresos,
  crearIngreso,
  borrarIngreso,
  getTendencia,
  getPatrimonioHistorico,
  getTendenciaRubros,
  getTendenciaTarjetas,
} from '../api';
import { money, esc, mesLargo, mesAnterior } from '../format';
import { iconoRubro, refreshIcons } from '../icons';
import { topbarBack } from '../chrome';
import {
  calcularAlertas,
  renderAlertasBanner,
  UMBRAL_MSI_WARN,
  UMBRAL_MSI_ERROR,
  UMBRAL_UTILIZACION_WARN,
  UMBRAL_UTILIZACION_ERROR,
} from '../alertas';

const periodoActual = () => new Date().toISOString().slice(0, 7);

const colorGuardrail = (pct: number) =>
  pct >= UMBRAL_MSI_ERROR ? 'var(--status-error)' : pct >= UMBRAL_MSI_WARN ? 'var(--status-warn)' : 'var(--status-ok)';

const barra = (etiqueta: string, alto: number, color: string, mes: string) =>
  `<div class="col"><span class="n">${etiqueta}</span><div class="b" style="height:${Math.max(4, alto)}px;background:${color}"></div><span class="m">${mes}</span></div>`;

export async function renderSalud(root: HTMLElement, params?: URLSearchParams) {
  const abrirFormulario = params?.get('nuevo') === '1';
  root.innerHTML = `<div class="screen">${topbarBack('Salud financiera', '/')}<div class="placeholder">Cargando…</div></div>`;

  const [resumen, ingresos, tendencia, patrimonio, tendenciaRubros, tendenciaTarjetas] = await Promise.all([
    getResumen(),
    getIngresos(periodoActual()),
    getTendencia(6),
    getPatrimonioHistorico(6),
    getTendenciaRubros(6),
    getTendenciaTarjetas(6),
  ]);
  const { salud: sd, tarjetas, ingreso_total, fondo_emergencia: fondo } = resumen;
  const mesPasado = mesAnterior(resumen.periodo);
  const ingresosMesPasado = await getIngresos(mesPasado);
  const fuentesYaCopiadas = new Set(ingresos.map((i) => i.fuente));
  const copiables = ingresosMesPasado.filter((i) => !fuentesYaCopiadas.has(i.fuente));

  const alertas = calcularAlertas(resumen);

  const tasaTxt = sd.tasa_ahorro !== undefined ? `${sd.tasa_ahorro.toFixed(0)}%` : '—';
  const guardrailPct = sd.pct_ingreso_comprometido_msi;
  const guardrailTxt = guardrailPct !== undefined ? `${guardrailPct.toFixed(0)}%` : '—';
  const guardrailColor = guardrailPct !== undefined ? colorGuardrail(guardrailPct) : 'var(--text-muted)';

  const gastoClasificado = sd.gasto_fijo + sd.gasto_discrecional + sd.gasto_sin_clasificar;
  const pctFijo = gastoClasificado > 0 ? (sd.gasto_fijo / gastoClasificado) * 100 : 0;
  const pctDiscrecional = gastoClasificado > 0 ? (sd.gasto_discrecional / gastoClasificado) * 100 : 0;

  const nombreMesCorto = (periodo: string) => mesLargo(periodo).split(' ')[0].slice(0, 3);

  const tarjetasHtml = tarjetas
    .map((t) => {
      const color = t.pct_utilizacion >= UMBRAL_UTILIZACION_ERROR ? 'error' : t.pct_utilizacion >= UMBRAL_UTILIZACION_WARN ? 'warn' : '';
      const historico = tendenciaTarjetas.tarjetas.find((x) => x.id === t.id);
      const trendHtml = historico
        ? `<div class="chico" style="margin-top:10px">últimos ${tendenciaTarjetas.meses.length} meses: ${historico.pct_utilizacion
            .map((p, i) => `${nombreMesCorto(tendenciaTarjetas.meses[i])} ${p.toFixed(0)}%`)
            .join(' · ')}</div>`
        : '';
      return `
        <div class="bolsa-card">
          <div class="fila">
            <div class="icono"><i data-lucide="credit-card" style="width:18px;height:18px"></i></div>
            <div class="info">
              <div class="nombre">${esc(t.nombre)}</div>
              <div class="sub">${money(t.saldo_actual)} de ${money(t.limite)}</div>
            </div>
            <span class="pct" style="color:${color === 'error' ? 'var(--status-error)' : color === 'warn' ? 'var(--status-warn)' : 'var(--teal-deep)'}">${t.pct_utilizacion.toFixed(0)}%</span>
          </div>
          <div class="progress" style="margin-top:12px"><div class="${color}" style="width:${Math.min(t.pct_utilizacion, 100)}%"></div></div>
          ${trendHtml}
        </div>`;
    })
    .join('');

  const ingresosHtml = ingresos
    .map(
      (i) => `
      <div class="mov-item">
        <div class="icono"><i data-lucide="banknote" style="width:17px;height:17px"></i></div>
        <div class="info">
          <div class="desc">${esc(i.fuente)}</div>
          <div class="meta">${esc(mesLargo(i.periodo))}</div>
        </div>
        <span class="monto">${money(i.monto)}</span>
        <button type="button" class="icon-btn btn-borrar-ingreso" data-id="${i.id}" style="width:32px;height:32px;flex-shrink:0"><i data-lucide="trash-2" style="width:15px;height:15px"></i></button>
      </div>`
    )
    .join('');

  const maxTasa = Math.max(...tendencia.meses.map((m) => Math.abs(m.tasa_ahorro ?? 0)), 10);
  const barrasTendencia = tendencia.meses
    .map((m) => {
      const val = m.tasa_ahorro;
      const alto = val === undefined ? 4 : Math.round((Math.abs(val) / maxTasa) * 118);
      const color = val === undefined ? 'var(--surface-sunken)' : val < 0 ? 'var(--status-error)' : val < 10 ? 'var(--status-warn)' : 'var(--status-ok)';
      return barra(val === undefined ? '—' : `${val.toFixed(0)}%`, alto, color, nombreMesCorto(m.periodo));
    })
    .join('');

  const maxPatrimonio = Math.max(...patrimonio.meses.map((p) => Math.abs(p.monto)), 1);
  const barrasPatrimonio = patrimonio.meses
    .map((p) => {
      const alto = Math.round((Math.abs(p.monto) / maxPatrimonio) * 118);
      const color = p.monto < 0 ? 'var(--status-error)' : 'var(--teal)';
      return barra(`${(p.monto / 100000).toFixed(1)}k`, alto, color, nombreMesCorto(p.periodo));
    })
    .join('');

  const gastoRubrosHtml = tendenciaRubros.rubros
    .map((rt) => {
      const actual = rt.montos[rt.montos.length - 1] ?? 0;
      const anterior = rt.montos[rt.montos.length - 2] ?? 0;
      const pct = anterior > 0 ? ((actual - anterior) / anterior) * 100 : null;
      const color = pct === null || pct === 0 ? 'inherit' : pct > 0 ? 'var(--status-error)' : 'var(--status-ok)';
      const flecha = pct === null ? '—' : `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}%`;
      return `
        <div class="mov-item">
          <div class="icono"><i data-lucide="${iconoRubro(rt.nombre)}" style="width:17px;height:17px"></i></div>
          <div class="info">
            <div class="desc">${esc(rt.nombre)}</div>
            <div class="meta">${rt.montos.map((m) => money(m)).join(' → ')}</div>
          </div>
          <span class="monto" style="color:${color};font-size:13px">${flecha}</span>
        </div>`;
    })
    .join('');

  const fondoHtml = fondo
    ? `
      <div class="seccion-label"><span>&lt;fondo de emergencia&gt;</span></div>
      <div class="stat-box">
        <div class="fila-kv"><span class="k">Saldo actual</span><span class="v">${money(fondo.saldo)}</span></div>
        <div class="fila-kv" style="margin-top:8px"><span class="k">Meta mínima · 3 meses</span><span class="v">${money(fondo.objetivo_min)}</span></div>
        <div class="progress" style="margin-top:4px"><div style="width:${Math.min(fondo.avance_pct_min ?? 0, 100)}%"></div></div>
        <div class="chico" style="margin-top:10px">Meta completa · 6 meses: ${money(fondo.objetivo_max)} — gasto fijo promedio ${money(fondo.gasto_fijo_promedio_mensual)}/mes (últimos 3 meses)</div>
      </div>`
    : '';

  root.innerHTML = `
    <div class="screen">
      ${topbarBack('Salud financiera', '/')}

      ${renderAlertasBanner(alertas)}

      <div class="hero-mini">
        <div class="k">Patrimonio neto</div>
        <div class="v">${money(sd.patrimonio_neto)}</div>
        <div class="d">ahorro − compromiso MSI pendiente</div>
      </div>

      <div class="stat-pair">
        <div class="stat-box">
          <div class="label">&lt;tasa de ahorro&gt;</div>
          <div class="grande">${tasaTxt}</div>
          <div class="chico">(ingreso − gasto) / ingreso</div>
        </div>
        <div class="stat-box">
          <div class="label">&lt;guardrail MSI&gt;</div>
          <div class="grande" style="color:${guardrailColor}">${guardrailTxt}</div>
          <div class="chico">meta: no pasar de 20-30%</div>
        </div>
      </div>

      ${fondoHtml}

      <div class="seccion-label"><span>&lt;tasa de ahorro · últimos ${tendencia.meses.length} meses&gt;</span></div>
      <div class="bar-chart"><div class="cols">${barrasTendencia || '<div class="placeholder">Sin datos todavía</div>'}</div></div>

      <div class="seccion-label"><span>&lt;gasto por rubro · últimos ${tendenciaRubros.meses.length} meses&gt;</span></div>
      <div class="rubro-list">${gastoRubrosHtml || '<div class="placeholder">Sin rubros de gasto todavía</div>'}</div>

      <div class="seccion-label"><span>&lt;patrimonio neto · histórico&gt;</span></div>
      <div class="bar-chart"><div class="cols">${barrasPatrimonio || '<div class="placeholder">El histórico arranca este mes — vuelve el próximo</div>'}</div></div>

      <div class="seccion-label"><span>&lt;gasto fijo vs discrecional&gt;</span></div>
      <div class="stat-box">
        <div class="fila-kv"><span class="k">Fijo</span><span class="v">${money(sd.gasto_fijo)}</span></div>
        <div class="progress" style="margin-top:4px"><div style="width:${pctFijo}%"></div></div>
        <div class="fila-kv" style="margin-top:14px"><span class="k">Discrecional</span><span class="v">${money(sd.gasto_discrecional)}</span></div>
        <div class="progress" style="margin-top:4px"><div style="width:${pctDiscrecional}%;background:var(--teal)"></div></div>
        ${sd.gasto_sin_clasificar > 0 ? `<div class="chico" style="margin-top:10px">+ ${money(sd.gasto_sin_clasificar)} sin clasificar — <a href="#/">clasifica tus rubros</a></div>` : ''}
      </div>

      <div class="seccion-label"><span>&lt;utilización de crédito&gt;</span></div>
      <div class="rubro-list">${tarjetasHtml || '<div class="placeholder">Sin tarjetas todavía</div>'}</div>

      <div class="seccion-label"><span>&lt;ingresos · ${resumen.periodo}&gt; · total ${money(ingreso_total)}</span></div>
      <div class="rubro-list">${ingresosHtml || '<div class="placeholder">Sin ingresos registrados</div>'}</div>

      <div style="display:flex;gap:8px;margin-top:var(--space-4)">
        <button type="button" id="toggle-ingreso" class="btn-fantasma" style="flex:1">
          <i data-lucide="plus" style="width:18px;height:18px"></i>Registrar ingreso
        </button>
        ${
          copiables.length > 0
            ? `<button type="button" id="copiar-ingresos" class="btn-fantasma" style="flex:1">
                <i data-lucide="download" style="width:18px;height:18px"></i>Copiar mes anterior
              </button>`
            : ''
        }
      </div>
      <div id="form-ingreso" class="inline-form" ${abrirFormulario ? '' : 'hidden'}>
        <form id="fi">
          <div class="campo"><div class="k">Fuente</div><input id="fuente" type="text" placeholder="Ej. Salario, Freelance" required /></div>
          <div class="campo"><div class="k">Monto</div><input id="monto-ingreso" type="number" step="0.01" min="0.01" inputmode="decimal" placeholder="0.00" required /></div>
          <div class="error-msg" id="error-ingreso" hidden></div>
          <button class="btn-primario" type="submit"><i data-lucide="check" style="width:19px;height:19px"></i>Guardar ingreso</button>
        </form>
      </div>
    </div>
  `;
  refreshIcons();
  if (abrirFormulario) {
    root.querySelector('#form-ingreso')!.scrollIntoView({ block: 'center' });
    root.querySelector<HTMLInputElement>('#fuente')!.focus();
  }

  const formWrap = root.querySelector<HTMLDivElement>('#form-ingreso')!;
  root.querySelector('#toggle-ingreso')!.addEventListener('click', () => {
    formWrap.hidden = !formWrap.hidden;
  });
  root.querySelector<HTMLFormElement>('#fi')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = root.querySelector<HTMLDivElement>('#error-ingreso')!;
    errorEl.hidden = true;
    const fuente = (root.querySelector<HTMLInputElement>('#fuente')!).value.trim();
    const monto = Math.round(parseFloat((root.querySelector<HTMLInputElement>('#monto-ingreso')!).value) * 100);
    if (!fuente || !monto) {
      errorEl.textContent = 'Falta la fuente o el monto.';
      errorEl.hidden = false;
      return;
    }
    try {
      await crearIngreso({ fuente, monto, periodo: periodoActual() });
      await renderSalud(root);
    } catch (err) {
      errorEl.textContent = (err as Error).message;
      errorEl.hidden = false;
    }
  });

  root.querySelector('#copiar-ingresos')?.addEventListener('click', async () => {
    await Promise.all(copiables.map((i) => crearIngreso({ fuente: i.fuente, monto: i.monto, periodo: periodoActual() })));
    await renderSalud(root);
  });

  root.querySelectorAll<HTMLButtonElement>('.btn-borrar-ingreso').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Borrar este ingreso?')) return;
      await borrarIngreso(Number(btn.dataset.id));
      await renderSalud(root);
    });
  });
}
