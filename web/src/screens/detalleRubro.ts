import { getResumen, getGastos, getMetodos, crearAportacion, borrarGasto, actualizarRubro, getAportaciones } from '../api';
import { money, esc, fechaCorta, mesAnterior } from '../format';
import { iconoRubro, refreshIcons } from '../icons';
import { topbarBack } from '../chrome';

const periodoActual = () => new Date().toISOString().slice(0, 7);

export async function renderDetalleRubro(root: HTMLElement, params: URLSearchParams) {
  const id = Number(params.get('id'));
  root.innerHTML = `<div class="screen">${topbarBack('Rubro', '/')}<div class="placeholder">Cargando…</div></div>`;

  const [resumen, gastos, metodos] = await Promise.all([getResumen(), getGastos(), getMetodos()]);
  const r = resumen.rubros.find((x) => x.id === id);
  if (!r) {
    root.innerHTML = `<div class="screen">${topbarBack('Rubro', '/')}<div class="placeholder">No se encontró ese rubro.</div></div>`;
    return;
  }

  const [aportacionesEsteMes, aportacionesMesPasado] = await Promise.all([
    getAportaciones(resumen.periodo),
    getAportaciones(mesAnterior(resumen.periodo)),
  ]);
  const fuentesYaCubiertas = new Set(aportacionesEsteMes.filter((a) => a.rubro_id === id).map((a) => a.fuente));
  const copiables = aportacionesMesPasado.filter((a) => a.rubro_id === id && !fuentesYaCubiertas.has(a.fuente));

  const total = r.aportado_yo + r.aportado_pareja;
  const usado = r.gastado + r.cuotas_msi;
  const pctReal = total > 0 ? (usado / total) * 100 : 0;
  const estado = pctReal >= 100 ? 'error' : pctReal >= 90 ? 'warn' : '';
  const pct = Math.min(pctReal, 100);
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
          <button type="button" class="icon-btn btn-borrar" data-id="${g.id}" style="width:32px;height:32px;flex-shrink:0"><i data-lucide="trash-2" style="width:15px;height:15px;"></i></button>
        </div>`;
    })
    .join('');

  root.innerHTML = `
    <div class="screen">
      ${topbarBack(esc(r.nombre), '/', '<button type="button" id="toggle-editar" class="icon-btn"><i data-lucide="pencil" style="width:16px;height:16px;"></i></button>')}
      <div id="form-editar" class="inline-form" hidden>
        <form id="fe">
          <div class="campo">
            <div class="k">Nombre del rubro</div>
            <input id="nombre-rubro" type="text" value="${esc(r.nombre)}" required />
          </div>
          <div class="campo">
            <div class="k">Clasificación (opcional)</div>
            <div class="pills" id="pills-clasif-editar">
              <span class="pill ${r.clasificacion === 'fijo' ? 'activa' : ''}" data-c="fijo">Fijo</span>
              <span class="pill ${r.clasificacion === 'discrecional' ? 'activa' : ''}" data-c="discrecional">Discrecional</span>
            </div>
          </div>
          <button class="btn-primario" type="submit"><i data-lucide="check" style="width:19px;height:19px;"></i>Guardar</button>
        </form>
      </div>
      ${r.clasificacion ? `<div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);margin:4px 4px 12px">&lt;${r.clasificacion}&gt;</div>` : ''}
      <div class="hero-mini">
        <div class="k">Disponible este mes</div>
        <div class="v">${money(r.disponible)}</div>
        <div class="d">gastado ${money(usado)} de ${money(total)}</div>
        <div class="progress-dark"><div class="${estado}" style="width:${pct}%"></div></div>
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

      <div style="display:flex;gap:8px;margin-top:var(--space-4)">
        <button type="button" id="toggle-aportar" class="btn-fantasma" style="flex:1">
          <i data-lucide="plus" style="width:18px;height:18px;"></i>Registrar aportación
        </button>
        ${
          copiables.length > 0
            ? `<button type="button" id="copiar-aportaciones" class="btn-fantasma" style="flex:1">
                <i data-lucide="download" style="width:18px;height:18px;"></i>Copiar mes anterior
              </button>`
            : ''
        }
      </div>
      <div id="form-aportar" class="inline-form" hidden>
        <form id="fa">
          <div class="campo">
            <div class="k">Fuente</div>
            <div class="pills" id="pills-fuente">
              <span class="pill activa" data-f="yo">Tú</span>
              <span class="pill" data-f="pareja">Pareja</span>
            </div>
          </div>
          <div class="campo">
            <div class="k">Monto</div>
            <input id="monto-aportacion" type="number" step="0.01" min="0.01" inputmode="decimal" placeholder="0.00" required />
          </div>
          <div class="error-msg" id="error-aportar" hidden></div>
          <button class="btn-primario" type="submit"><i data-lucide="check" style="width:19px;height:19px;"></i>Guardar aportación</button>
        </form>
      </div>

      <div class="seccion-label"><span>&lt;movimientos&gt;</span></div>
      <div class="rubro-list">${movHtml || '<div class="placeholder">Sin movimientos todavía</div>'}</div>
    </div>
  `;
  refreshIcons();

  let clasifEditar = r.clasificacion;
  root.querySelector('#toggle-editar')!.addEventListener('click', () => {
    const el = root.querySelector<HTMLDivElement>('#form-editar')!;
    el.hidden = !el.hidden;
  });
  root.querySelector('#pills-clasif-editar')!.addEventListener('click', (e) => {
    const p = (e.target as HTMLElement).closest<HTMLElement>('.pill');
    if (!p) return;
    const c = p.dataset.c as 'fijo' | 'discrecional';
    clasifEditar = clasifEditar === c ? undefined : c;
    root.querySelectorAll('#pills-clasif-editar .pill').forEach((el) => el.classList.toggle('activa', el.getAttribute('data-c') === clasifEditar));
  });
  root.querySelector<HTMLFormElement>('#fe')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = (root.querySelector<HTMLInputElement>('#nombre-rubro')!).value.trim();
    if (!nombre) return;
    await actualizarRubro(id, { nombre, clasificacion: clasifEditar });
    renderDetalleRubro(root, params);
  });

  let fuente: 'yo' | 'pareja' = 'yo';
  root.querySelector('#toggle-aportar')!.addEventListener('click', () => {
    const el = root.querySelector<HTMLDivElement>('#form-aportar')!;
    el.hidden = !el.hidden;
  });
  root.querySelector('#pills-fuente')!.addEventListener('click', (e) => {
    const p = (e.target as HTMLElement).closest<HTMLElement>('.pill');
    if (!p) return;
    fuente = p.dataset.f as 'yo' | 'pareja';
    root.querySelectorAll('#pills-fuente .pill').forEach((el) => el.classList.toggle('activa', el === p));
  });
  root.querySelector<HTMLFormElement>('#fa')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = root.querySelector<HTMLDivElement>('#error-aportar')!;
    errorEl.hidden = true;
    const monto = Math.round(parseFloat((root.querySelector<HTMLInputElement>('#monto-aportacion')!).value) * 100);
    if (!monto) {
      errorEl.textContent = 'Falta el monto.';
      errorEl.hidden = false;
      return;
    }
    try {
      await crearAportacion({ rubro_id: id, fuente, monto, periodo: periodoActual() });
      renderDetalleRubro(root, params);
    } catch (err) {
      errorEl.textContent = (err as Error).message;
      errorEl.hidden = false;
    }
  });

  root.querySelector('#copiar-aportaciones')?.addEventListener('click', async () => {
    await Promise.all(copiables.map((a) => crearAportacion({ rubro_id: id, fuente: a.fuente, monto: a.monto, periodo: periodoActual() })));
    renderDetalleRubro(root, params);
  });

  root.querySelectorAll<HTMLButtonElement>('.btn-borrar').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Borrar este gasto?')) return;
      await borrarGasto(Number(btn.dataset.id));
      renderDetalleRubro(root, params);
    });
  });
}
