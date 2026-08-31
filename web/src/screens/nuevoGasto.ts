import { getRubros, getMetodos, getResumen, crearGasto } from '../api';
import { money, esc } from '../format';
import { iconoRubro, refreshIcons } from '../icons';
import { topbarBack } from '../chrome';

const hoy = () => new Date().toISOString().slice(0, 10);

export async function renderNuevoGasto(root: HTMLElement) {
  root.innerHTML = `<div class="screen">${topbarBack('Nuevo gasto', '/')}<div class="placeholder">Cargando…</div></div>`;

  const [rubros, metodos, resumen] = await Promise.all([getRubros(), getMetodos(), getResumen()]);
  const rubrosGasto = rubros.filter((r) => r.tipo === 'gasto');
  let rubroId = rubrosGasto[0]?.id;

  const disponibleDe = (id?: number) => resumen.rubros.find((r) => r.id === id)?.disponible ?? null;

  root.innerHTML = `
    <div class="screen">
      ${topbarBack('Nuevo gasto', '/')}
      <form id="f">
        <div class="campo">
          <div class="monto-grande">
            <div class="k">Monto</div>
            <input id="monto" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0.00" required />
          </div>
        </div>
        <div class="campo">
          <div class="k">Rubro</div>
          <div class="pills" id="pills-rubro">
            ${rubrosGasto
              .map(
                (r) =>
                  `<span class="pill ${r.id === rubroId ? 'activa' : ''}" data-id="${r.id}">
                     <i data-lucide="${iconoRubro(r.nombre)}" style="width:15px;height:15px;"></i>${esc(r.nombre)}
                   </span>`
              )
              .join('')}
          </div>
          <div class="hint-disponible" id="hint"><i data-lucide="wallet" style="width:14px;height:14px;"></i>${
            rubroId ? `Disponible en ${esc(rubrosGasto[0].nombre)}: ${money(disponibleDe(rubroId) ?? 0)}` : 'Sin rubros de gasto todavía'
          }</div>
        </div>
        <div class="campo">
          <div class="k">Método de pago</div>
          <div class="select-wrap">
            <select id="metodo" required>
              ${metodos.map((m) => `<option value="${m.id}">${esc(m.nombre)}</option>`).join('')}
            </select>
            <i data-lucide="chevron-down" style="width:18px;height:18px;"></i>
          </div>
        </div>
        <div class="campo">
          <div class="k">Fecha</div>
          <input id="fecha" type="date" value="${hoy()}" required />
        </div>
        <div class="campo">
          <div class="k">Descripción</div>
          <input id="descripcion" type="text" placeholder="¿En qué fue?" />
        </div>
        <div class="error-msg" id="error" hidden></div>
      </form>
      <div style="flex-shrink:0"></div>
    </div>
    <div class="barra-inferior">
      <button form="f" class="btn-primario" type="submit" ${rubroId ? '' : 'disabled'}>
        <i data-lucide="check" style="width:19px;height:19px;"></i>Guardar gasto
      </button>
    </div>
  `;

  const pillsEl = root.querySelector<HTMLDivElement>('#pills-rubro')!;
  const hintEl = root.querySelector<HTMLDivElement>('#hint')!;
  pillsEl.addEventListener('click', (e) => {
    const pill = (e.target as HTMLElement).closest<HTMLElement>('.pill');
    if (!pill) return;
    rubroId = Number(pill.dataset.id);
    pillsEl.querySelectorAll('.pill').forEach((p) => p.classList.toggle('activa', p === pill));
    const r = rubrosGasto.find((x) => x.id === rubroId)!;
    hintEl.innerHTML = `<i data-lucide="wallet" style="width:14px;height:14px;"></i>Disponible en ${esc(r.nombre)}: ${money(disponibleDe(rubroId) ?? 0)}`;
    refreshIcons();
  });

  root.querySelector<HTMLFormElement>('#f')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = root.querySelector<HTMLDivElement>('#error')!;
    errorEl.hidden = true;
    const montoStr = (root.querySelector<HTMLInputElement>('#monto')!).value;
    const monto = Math.round(parseFloat(montoStr) * 100);
    if (!rubroId || !monto || monto <= 0) {
      errorEl.textContent = 'Falta el monto o el rubro.';
      errorEl.hidden = false;
      return;
    }
    try {
      await crearGasto({
        rubro_id: rubroId,
        metodo_pago_id: Number((root.querySelector<HTMLSelectElement>('#metodo')!).value),
        monto,
        fecha: (root.querySelector<HTMLInputElement>('#fecha')!).value,
        descripcion: (root.querySelector<HTMLInputElement>('#descripcion')!).value,
      });
      location.hash = '#/';
    } catch (err) {
      errorEl.textContent = (err as Error).message;
      errorEl.hidden = false;
    }
  });
}
