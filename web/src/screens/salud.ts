import { getResumen, getIngresos, crearIngreso, borrarIngreso } from '../api';
import { money, esc, mesLargo } from '../format';
import { refreshIcons } from '../icons';
import { topbarBack } from '../chrome';

const periodoActual = () => new Date().toISOString().slice(0, 7);

// Guardrail del plan: "no superar 20-30% de ingreso comprometido en MSI".
const colorGuardrail = (pct: number) => (pct >= 30 ? 'var(--status-error)' : pct >= 20 ? 'var(--status-warn)' : 'var(--status-ok)');

export async function renderSalud(root: HTMLElement, params?: URLSearchParams) {
  const abrirFormulario = params?.get('nuevo') === '1';
  root.innerHTML = `<div class="screen">${topbarBack('Salud financiera', '/')}<div class="placeholder">Cargando…</div></div>`;

  const [resumen, ingresos] = await Promise.all([getResumen(), getIngresos()]);
  const { salud: sd, tarjetas, ingreso_total } = resumen;

  const tasaTxt = sd.tasa_ahorro !== undefined ? `${sd.tasa_ahorro.toFixed(0)}%` : '—';
  const guardrailPct = sd.pct_ingreso_comprometido_msi;
  const guardrailTxt = guardrailPct !== undefined ? `${guardrailPct.toFixed(0)}%` : '—';
  const guardrailColor = guardrailPct !== undefined ? colorGuardrail(guardrailPct) : 'var(--text-muted)';

  const gastoClasificado = sd.gasto_fijo + sd.gasto_discrecional + sd.gasto_sin_clasificar;
  const pctFijo = gastoClasificado > 0 ? (sd.gasto_fijo / gastoClasificado) * 100 : 0;
  const pctDiscrecional = gastoClasificado > 0 ? (sd.gasto_discrecional / gastoClasificado) * 100 : 0;

  const tarjetasHtml = tarjetas
    .map((t) => {
      const color = t.pct_utilizacion >= 80 ? 'error' : t.pct_utilizacion >= 50 ? 'warn' : '';
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

  root.innerHTML = `
    <div class="screen">
      ${topbarBack('Salud financiera', '/')}

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

      <button type="button" id="toggle-ingreso" class="btn-fantasma" style="margin-top:var(--space-4)">
        <i data-lucide="plus" style="width:18px;height:18px"></i>Registrar ingreso
      </button>
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

  root.querySelectorAll<HTMLButtonElement>('.btn-borrar-ingreso').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Borrar este ingreso?')) return;
      await borrarIngreso(Number(btn.dataset.id));
      await renderSalud(root);
    });
  });
}
