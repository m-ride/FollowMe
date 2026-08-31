import { getResumen, crearAportacion } from '../api';
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
          </div>
          ${pct !== null ? `<div class="progress" style="margin-top:12px"><div style="width:${pct}%"></div></div>` : ''}
        </div>`;
    })
    .join('');

  root.innerHTML = `
    <div class="screen">
      <div style="padding:8px 4px 0">
        <div style="font-family:var(--font-mono);font-size:11px;letter-spacing:0.06em;color:var(--text-muted)">ahorro</div>
        <div style="font-family:var(--font-display);font-weight:700;font-size:24px;letter-spacing:-0.02em;margin-top:2px">Tus bolsas</div>
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
