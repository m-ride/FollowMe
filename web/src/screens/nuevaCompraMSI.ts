import { getMetodos, getRubros, getResumen, crearCompraMSI, type CompraMSI } from '../api';
import { money, esc, mesCorto } from '../format';
import { topbarBack } from '../chrome';
import { refreshIcons } from '../icons';

const PLAZOS = [3, 6, 12, 18, 24];
const hoy = () => new Date().toISOString().slice(0, 10);

export async function renderNuevaCompraMSI(root: HTMLElement) {
  root.innerHTML = `<div class="screen">${topbarBack('Compra a meses', '/msi')}<div class="placeholder">Cargando…</div></div>`;

  const [metodos, rubros, resumen] = await Promise.all([getMetodos(), getRubros(), getResumen()]);
  const tarjetas = metodos.filter((m) => m.tipo === 'credito');
  const rubrosGasto = rubros.filter((r) => r.tipo === 'gasto');
  let plazo = 12;

  if (tarjetas.length === 0) {
    root.innerHTML = `<div class="screen">${topbarBack('Compra a meses', '/msi')}<div class="placeholder">Necesitas registrar una tarjeta de crédito primero (pantalla de Métodos de pago).</div></div>`;
    return;
  }

  // Guardrail del plan: "no superar 20-30% de ingreso comprometido en MSI" — estimado
  // con la cuota mensual de ESTA compra sumada al compromiso del mes actual.
  const ingresoMensual = resumen.ingreso_total;
  const compromisoActual = resumen.compromiso_msi.meses.find((m) => m.mes === resumen.periodo)?.total ?? 0;

  const previa = (montoStr: string) => {
    const total = Math.round(parseFloat(montoStr || '0') * 100);
    if (!total) return '';
    const base = Math.floor(total / plazo);
    let guardrail = '';
    if (ingresoMensual > 0) {
      const pctNuevo = ((compromisoActual + base) / ingresoMensual) * 100;
      const color = pctNuevo >= 30 ? 'var(--status-error)' : pctNuevo >= 20 ? 'var(--status-warn)' : 'var(--status-ok)';
      const aviso = pctNuevo >= 20 ? `<div class="chico" style="margin-top:8px;color:${color}">Esto dejaría el ${pctNuevo.toFixed(0)}% de tu ingreso comprometido en MSI — el plan sugiere no pasar de 20-30%.</div>` : '';
      guardrail = `<div class="fila-kv" style="margin-top:10px"><span class="k">Ingreso comprometido en MSI (con esta compra)</span><span class="v" style="color:${color}">${pctNuevo.toFixed(0)}%</span></div>${aviso}`;
    }
    return `<div class="stat-box" style="margin-top:var(--space-4)">
      <div class="label" style="color:var(--text-accent)">&lt;cronograma estimado&gt;</div>
      <div class="fila-kv" style="align-items:baseline">
        <span class="k">${plazo} cuotas de</span><span style="font-family:var(--font-display);font-weight:700;font-size:24px">~${money(base)}</span>
      </div>
      ${guardrail}
    </div>`;
  };

  const render = () => {
    root.innerHTML = `
      <div class="screen">
        ${topbarBack('Compra a meses', '/msi')}
        <form id="f">
          <div class="campo">
            <div class="k">Tarjeta</div>
            <div class="select-wrap">
              <select id="tarjeta" required>${tarjetas.map((t) => `<option value="${t.id}">${esc(t.nombre)}</option>`).join('')}</select>
              <i data-lucide="chevron-down" style="width:18px;height:18px;"></i>
            </div>
          </div>
          <div class="campo">
            <div class="k">Rubro</div>
            <div class="select-wrap">
              <select id="rubro" required>${rubrosGasto.map((r) => `<option value="${r.id}">${esc(r.nombre)}</option>`).join('')}</select>
              <i data-lucide="chevron-down" style="width:18px;height:18px;"></i>
            </div>
          </div>
          <div class="campo">
            <div class="k">Descripción</div>
            <input id="descripcion" type="text" placeholder="¿Qué compraste?" />
          </div>
          <div style="display:flex;gap:12px">
            <div class="campo" style="flex:1.2">
              <div class="k">Monto total</div>
              <input id="monto" type="number" step="0.01" min="0.01" inputmode="decimal" placeholder="0.00" required />
            </div>
            <div class="campo" style="flex:1">
              <div class="k">Fecha</div>
              <input id="fecha" type="date" value="${hoy()}" required />
            </div>
          </div>
          <div class="campo">
            <div class="k">Plazo</div>
            <div class="pills" id="pills-plazo">
              ${PLAZOS.map((p) => `<span class="pill-num ${p === plazo ? 'activa' : ''}" data-p="${p}">${p}</span>`).join('')}
            </div>
          </div>
          <div id="previa">${previa('0')}</div>
          <div class="error-msg" id="error" hidden></div>
        </form>
      </div>
      <div class="barra-inferior">
        <button form="f" class="btn-primario" type="submit"><i data-lucide="check" style="width:19px;height:19px;"></i>Registrar compra</button>
      </div>
    `;

    const montoEl = root.querySelector<HTMLInputElement>('#monto')!;
    const previaEl = root.querySelector<HTMLDivElement>('#previa')!;
    montoEl.addEventListener('input', () => {
      previaEl.innerHTML = previa(montoEl.value);
    });

    root.querySelector<HTMLDivElement>('#pills-plazo')!.addEventListener('click', (e) => {
      const p = (e.target as HTMLElement).closest<HTMLElement>('.pill-num');
      if (!p) return;
      plazo = Number(p.dataset.p);
      root.querySelectorAll('#pills-plazo .pill-num').forEach((el) => el.classList.toggle('activa', el === p));
      previaEl.innerHTML = previa(montoEl.value);
    });

    root.querySelector<HTMLFormElement>('#f')!.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = root.querySelector<HTMLDivElement>('#error')!;
      errorEl.hidden = true;
      const monto_total = Math.round(parseFloat(montoEl.value) * 100);
      if (!monto_total) {
        errorEl.textContent = 'Falta el monto.';
        errorEl.hidden = false;
        return;
      }
      try {
        const compra = await crearCompraMSI({
          tarjeta_id: Number((root.querySelector<HTMLSelectElement>('#tarjeta')!).value),
          rubro_id: Number((root.querySelector<HTMLSelectElement>('#rubro')!).value),
          descripcion: (root.querySelector<HTMLInputElement>('#descripcion')!).value,
          monto_total,
          plazo_meses: plazo,
          fecha_compra: (root.querySelector<HTMLInputElement>('#fecha')!).value,
        });
        renderConfirmacion(compra);
      } catch (err) {
        errorEl.textContent = (err as Error).message;
        errorEl.hidden = false;
      }
    });
  };

  const renderConfirmacion = (c: CompraMSI) => {
    root.innerHTML = `
      <div class="screen">
        ${topbarBack('Compra registrada', '/msi')}
        <div class="stat-box" style="margin-top:var(--space-4)">
          <div class="label" style="color:var(--text-accent)">&lt;cronograma generado&gt;</div>
          <div class="fila-kv" style="align-items:baseline">
            <span class="k">${c.cuotas.length} cuotas de</span>
            <span style="font-family:var(--font-display);font-weight:700;font-size:24px">${money(c.cuotas[0]?.monto ?? 0)}</span>
          </div>
          <hr />
          ${c.cuotas.map((q) => `<div class="fila-kv"><span class="k">Cuota ${q.numero_cuota} · ${mesCorto(q.fecha_vencimiento.slice(0, 7))}</span><span class="v">${money(q.monto)}</span></div>`).join('')}
        </div>
      </div>
      <div class="barra-inferior">
        <a href="#/msi" class="btn-primario" style="text-decoration:none">Ver compromiso MSI</a>
      </div>
    `;
    refreshIcons();
  };

  render();
}
