import { getResumen, crearAportacion, actualizarRubro } from '../api';
import { money, esc } from '../format';
import { iconoRubro, refreshIcons } from '../icons';
import { renderNav } from '../nav';

const periodoActual = () => new Date().toISOString().slice(0, 7);

export async function renderAhorro(root: HTMLElement) {
  root.innerHTML = `<div class="screen"><div class="placeholder">Cargando…</div></div>${renderNav('/ahorro')}`;

  const resumen = await getResumen();
  const bolsas = resumen.ahorro;
  const totalAhorrado = bolsas.reduce((s, b) => s + b.saldo, 0);
  const metaTotal = bolsas.reduce((s, b) => s + (b.monto_objetivo ?? 0), 0);

  const bolsasHtml = bolsas
    .map((b) => {
      const pct = b.avance_pct !== undefined ? Math.min(Math.round(b.avance_pct), 100) : null;
      return `
        <div class="bolsa-card">
          <div class="fila">
            <div class="icono"><i data-lucide="${iconoRubro(b.nombre)}" style="width:20px;height:20px;"></i></div>
            <div class="info">
              <div class="nombre">${esc(b.nombre)}</div>
              <div class="sub">${money(b.saldo)}${b.monto_objetivo ? ` de ${money(b.monto_objetivo)}` : ''}</div>
            </div>
            ${pct !== null ? `<span class="pct">${pct}%</span>` : ''}
            <button type="button" class="icon-btn btn-editar-bolsa" data-id="${b.id}" style="width:32px;height:32px;flex-shrink:0"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
          </div>
          ${pct !== null ? `<div class="progress" style="margin-top:12px"><div style="width:${pct}%"></div></div>` : ''}
          <div class="inline-form" data-editar="${b.id}" hidden>
            <form class="form-editar-bolsa" data-id="${b.id}">
              <div class="campo"><div class="k">Nombre</div><input class="input-nombre" type="text" value="${esc(b.nombre)}" required /></div>
              <div class="campo"><div class="k">Meta de ahorro (opcional)</div><input class="input-meta" type="number" step="0.01" min="0" value="${b.monto_objetivo ? (b.monto_objetivo / 100).toFixed(2) : ''}" /></div>
              <button class="btn-primario" type="submit"><i data-lucide="check" style="width:19px;height:19px;"></i>Guardar</button>
            </form>
          </div>
        </div>`;
    })
    .join('');

  root.innerHTML = `
    <div class="screen">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 4px 0">
        <div>
          <div style="font-family:var(--font-mono);font-size:11px;letter-spacing:0.06em;color:var(--text-muted)">ahorro</div>
          <div style="font-family:var(--font-display);font-weight:700;font-size:24px;letter-spacing:-0.02em;margin-top:2px">Tus bolsas</div>
        </div>
        <a href="#/rubro/nuevo?tipo=ahorro" class="icon-btn oscuro"><i data-lucide="plus" style="width:20px;height:20px;"></i></a>
      </div>
      <div class="hero-mini" style="margin-top:var(--space-4)">
        <div class="k">Total ahorrado</div>
        <div class="v">${money(totalAhorrado)}</div>
        <div class="d">en ${bolsas.length} bolsa${bolsas.length === 1 ? '' : 's'}${metaTotal ? ` · meta total ${money(metaTotal)}` : ''}</div>
      </div>
      <div class="rubro-list" style="margin-top:var(--space-4)">${bolsasHtml || '<div class="placeholder">Sin bolsas de ahorro todavía</div>'}</div>

      <button id="toggle-aportar" class="btn-fantasma" style="margin-top:var(--space-4)">
        <i data-lucide="plus" style="width:18px;height:18px;"></i>Registrar aportación
      </button>
      <div id="form-aportar" class="inline-form" hidden>
        <form id="f">
          <div class="campo select-wrap">
            <div class="k">Bolsa</div>
            <select id="bolsa" required>${bolsas.map((b) => `<option value="${b.id}">${esc(b.nombre)}</option>`).join('')}</select>
            <i data-lucide="chevron-down" style="width:18px;height:18px;"></i>
          </div>
          <div class="campo">
            <div class="k">Fuente</div>
            <div class="pills" id="pills-fuente">
              <span class="pill activa" data-f="yo">Tú</span>
              <span class="pill" data-f="pareja">Pareja</span>
            </div>
          </div>
          <div class="campo">
            <div class="k">Monto</div>
            <input id="monto" type="number" step="0.01" min="0.01" inputmode="decimal" placeholder="0.00" required />
          </div>
          <div class="error-msg" id="error" hidden></div>
          <button class="btn-primario" type="submit"><i data-lucide="check" style="width:19px;height:19px;"></i>Guardar aportación</button>
        </form>
      </div>
    </div>
    ${renderNav('/ahorro')}
  `;
  refreshIcons();

  root.querySelectorAll<HTMLButtonElement>('.btn-editar-bolsa').forEach((btn) => {
    btn.addEventListener('click', () => {
      const el = root.querySelector<HTMLDivElement>(`[data-editar="${btn.dataset.id}"]`)!;
      el.hidden = !el.hidden;
    });
  });
  root.querySelectorAll<HTMLFormElement>('.form-editar-bolsa').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = Number(form.dataset.id);
      const nombre = form.querySelector<HTMLInputElement>('.input-nombre')!.value.trim();
      const metaStr = form.querySelector<HTMLInputElement>('.input-meta')!.value;
      if (!nombre) return;
      await actualizarRubro(id, {
        nombre,
        ...(metaStr ? { monto_objetivo: Math.round(parseFloat(metaStr) * 100) } : {}),
      });
      await renderAhorro(root);
      refreshIcons();
    });
  });

  if (bolsas.length === 0) return;

  let fuente: 'yo' | 'pareja' = 'yo';
  const formWrap = root.querySelector<HTMLDivElement>('#form-aportar')!;
  root.querySelector('#toggle-aportar')!.addEventListener('click', () => {
    formWrap.hidden = !formWrap.hidden;
  });
  root.querySelector('#pills-fuente')!.addEventListener('click', (e) => {
    const p = (e.target as HTMLElement).closest<HTMLElement>('.pill');
    if (!p) return;
    fuente = p.dataset.f as 'yo' | 'pareja';
    root.querySelectorAll('#pills-fuente .pill').forEach((el) => el.classList.toggle('activa', el === p));
  });
  root.querySelector<HTMLFormElement>('#f')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = root.querySelector<HTMLDivElement>('#error')!;
    errorEl.hidden = true;
    const monto = Math.round(parseFloat((root.querySelector<HTMLInputElement>('#monto')!).value) * 100);
    if (!monto) {
      errorEl.textContent = 'Falta el monto.';
      errorEl.hidden = false;
      return;
    }
    try {
      await crearAportacion({
        rubro_id: Number((root.querySelector<HTMLSelectElement>('#bolsa')!).value),
        fuente,
        monto,
        periodo: periodoActual(),
      });
      await renderAhorro(root);
      refreshIcons();
    } catch (err) {
      errorEl.textContent = (err as Error).message;
      errorEl.hidden = false;
    }
  });
}
