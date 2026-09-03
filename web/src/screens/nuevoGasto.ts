import { getRubros, getMetodos, getResumen, crearGasto, crearAportacion, crearIngreso, getMiPerfil, getMiembrosHogar } from '../api';
import { money, esc, periodoActual } from '../format';
import { iconoRubro, refreshIcons } from '../icons';
import { topbarBack } from '../chrome';

const hoy = () => new Date().toISOString().slice(0, 10);

type Tipo = 'gasto' | 'aportacion' | 'ingreso';

const AYUDA: Record<Tipo, string> = {
  gasto: 'Dinero que sale de un rubro (ej. comida, renta).',
  aportacion: 'Dinero de alguien del hogar que fondea el presupuesto de un rubro.',
  ingreso: 'Dinero que entra (salario, bono, etc.), sin ligarlo a un rubro.',
};

export async function renderNuevoGasto(root: HTMLElement) {
  root.innerHTML = `<div class="screen">${topbarBack('Nuevo', '/')}<div class="placeholder">Cargando…</div></div>`;

  const [rubros, metodos, resumen, yo, hogar] = await Promise.all([
    getRubros(),
    getMetodos(),
    getResumen(),
    getMiPerfil(),
    getMiembrosHogar(),
  ]);
  const rubrosGasto = rubros.filter((r) => r.tipo === 'gasto');
  let tipo: Tipo = 'gasto';
  let rubroId = rubrosGasto[0]?.id;
  let usuarioId: string = yo.id;

  const disponibleDe = (id?: number) => resumen.rubros.find((r) => r.id === id)?.disponible ?? null;

  root.innerHTML = `
    <div class="screen">
      ${topbarBack('Nuevo', '/')}
      <div class="campo">
        <div class="pills" id="pills-tipo">
          <span class="pill activa" data-t="gasto">Gasto</span>
          <span class="pill" data-t="aportacion">Aportación</span>
          <span class="pill" data-t="ingreso">Ingreso</span>
        </div>
        <div class="hint-disponible" id="ayuda-tipo"><i data-lucide="info" style="width:14px;height:14px;"></i>${AYUDA.gasto}</div>
      </div>
      <form id="f">
        <div class="campo">
          <div class="monto-grande">
            <div class="k">Monto</div>
            <input id="monto" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0.00" required />
          </div>
        </div>
        <div class="campo" id="campo-rubro">
          <div class="k">Rubro</div>
          <div class="pills" id="pills-rubro"></div>
          <div class="hint-disponible" id="hint"></div>
        </div>
        <div class="campo" id="campo-fuente-ingreso" hidden>
          <div class="k">Fuente</div>
          <input id="fuente-ingreso" type="text" placeholder="Ej. Nómina, Bono del Q, Freelance" />
        </div>
        <div class="campo" id="campo-fuente" hidden>
          <div class="k">Quién aporta</div>
          <div class="pills" id="pills-aportante">
            ${hogar.map((p) => `<span class="pill ${p.id === yo.id ? 'activa' : ''}" data-uid="${p.id}">${esc(p.nombre)}</span>`).join('')}
          </div>
        </div>
        <div class="campo" id="campo-metodo">
          <div class="k">Método de pago</div>
          <div class="select-wrap">
            <select id="metodo">
              ${metodos.map((m) => `<option value="${m.id}">${esc(m.nombre)}</option>`).join('')}
            </select>
            <i data-lucide="chevron-down" style="width:18px;height:18px;"></i>
          </div>
        </div>
        <div class="campo" id="campo-fecha">
          <div class="k">Fecha</div>
          <input id="fecha" type="date" value="${hoy()}" />
        </div>
        <div class="campo" id="campo-descripcion">
          <div class="k">Descripción</div>
          <input id="descripcion" type="text" placeholder="¿En qué fue?" />
        </div>
        <div class="error-msg" id="error" hidden></div>
      </form>
      <div style="flex-shrink:0"></div>
    </div>
    <div class="barra-inferior">
      <button form="f" class="btn-primario" type="submit" id="btn-guardar">
        <i data-lucide="check" style="width:19px;height:19px;"></i>Guardar gasto
      </button>
    </div>
  `;

  const ayudaTipoEl = root.querySelector<HTMLDivElement>('#ayuda-tipo')!;
  const pillsRubroEl = root.querySelector<HTMLDivElement>('#pills-rubro')!;
  const hintEl = root.querySelector<HTMLDivElement>('#hint')!;
  const campoRubro = root.querySelector<HTMLDivElement>('#campo-rubro')!;
  const campoFuenteIngreso = root.querySelector<HTMLDivElement>('#campo-fuente-ingreso')!;
  const campoFuente = root.querySelector<HTMLDivElement>('#campo-fuente')!;
  const campoMetodo = root.querySelector<HTMLDivElement>('#campo-metodo')!;
  const campoFecha = root.querySelector<HTMLDivElement>('#campo-fecha')!;
  const campoDescripcion = root.querySelector<HTMLDivElement>('#campo-descripcion')!;
  const btnGuardar = root.querySelector<HTMLButtonElement>('#btn-guardar')!;

  const rubrosParaTipo = () => (tipo === 'gasto' ? rubrosGasto : rubros);

  const TEXTO_BOTON: Record<Tipo, string> = { gasto: 'Guardar gasto', aportacion: 'Guardar aportación', ingreso: 'Guardar ingreso' };

  function pintarHint() {
    if (tipo !== 'gasto') {
      hintEl.hidden = true;
      return;
    }
    hintEl.hidden = false;
    const r = rubrosGasto.find((x) => x.id === rubroId);
    hintEl.innerHTML = r
      ? `<i data-lucide="wallet" style="width:14px;height:14px;"></i>Disponible en ${esc(r.nombre)}: ${money(disponibleDe(rubroId) ?? 0)}`
      : 'Sin rubros de gasto todavía';
    refreshIcons();
  }

  function pintarPillsRubro() {
    const lista = rubrosParaTipo();
    pillsRubroEl.innerHTML = lista
      .map(
        (r) =>
          `<span class="pill ${r.id === rubroId ? 'activa' : ''}" data-id="${r.id}">
             <i data-lucide="${iconoRubro(r.nombre)}" style="width:15px;height:15px;"></i>${esc(r.nombre)}
           </span>`
      )
      .join('');
    refreshIcons();
    pintarHint();
  }
  pintarPillsRubro();

  root.querySelector('#pills-tipo')!.addEventListener('click', (e) => {
    const p = (e.target as HTMLElement).closest<HTMLElement>('.pill');
    if (!p) return;
    tipo = p.dataset.t as Tipo;
    root.querySelectorAll('#pills-tipo .pill').forEach((el) => el.classList.toggle('activa', el === p));
    ayudaTipoEl.innerHTML = `<i data-lucide="info" style="width:14px;height:14px;"></i>${AYUDA[tipo]}`;
    rubroId = rubrosParaTipo()[0]?.id;
    pintarPillsRubro();
    campoRubro.hidden = tipo === 'ingreso';
    campoFuenteIngreso.hidden = tipo !== 'ingreso';
    campoFuente.hidden = tipo !== 'aportacion';
    campoMetodo.hidden = tipo !== 'gasto';
    campoFecha.hidden = tipo !== 'gasto';
    campoDescripcion.hidden = tipo !== 'gasto';
    btnGuardar.innerHTML = `<i data-lucide="check" style="width:19px;height:19px;"></i>${TEXTO_BOTON[tipo]}`;
    refreshIcons();
  });

  pillsRubroEl.addEventListener('click', (e) => {
    const pill = (e.target as HTMLElement).closest<HTMLElement>('.pill');
    if (!pill) return;
    rubroId = Number(pill.dataset.id);
    pillsRubroEl.querySelectorAll('.pill').forEach((p) => p.classList.toggle('activa', p === pill));
    pintarHint();
  });

  root.querySelector('#pills-aportante')!.addEventListener('click', (e) => {
    const p = (e.target as HTMLElement).closest<HTMLElement>('.pill');
    if (!p) return;
    usuarioId = p.dataset.uid!;
    root.querySelectorAll('#pills-aportante .pill').forEach((el) => el.classList.toggle('activa', el === p));
  });

  root.querySelector<HTMLFormElement>('#f')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = root.querySelector<HTMLDivElement>('#error')!;
    errorEl.hidden = true;
    const montoStr = (root.querySelector<HTMLInputElement>('#monto')!).value;
    const monto = Math.round(parseFloat(montoStr) * 100);
    const fuenteIngreso = (root.querySelector<HTMLInputElement>('#fuente-ingreso')!).value.trim();
    if (!monto || monto <= 0 || (tipo !== 'ingreso' && !rubroId) || (tipo === 'ingreso' && !fuenteIngreso)) {
      errorEl.textContent = tipo === 'ingreso' ? 'Falta el monto o la fuente.' : 'Falta el monto o el rubro.';
      errorEl.hidden = false;
      return;
    }
    try {
      if (tipo === 'gasto') {
        await crearGasto({
          rubro_id: rubroId!,
          metodo_pago_id: Number((root.querySelector<HTMLSelectElement>('#metodo')!).value),
          monto,
          fecha: (root.querySelector<HTMLInputElement>('#fecha')!).value,
          descripcion: (root.querySelector<HTMLInputElement>('#descripcion')!).value,
        });
      } else if (tipo === 'aportacion') {
        await crearAportacion({ rubro_id: rubroId!, usuario_id: usuarioId, monto, periodo: periodoActual() });
      } else {
        await crearIngreso({ fuente: fuenteIngreso, monto, periodo: periodoActual() });
      }
      location.hash = '#/';
    } catch (err) {
      errorEl.textContent = (err as Error).message;
      errorEl.hidden = false;
    }
  });
}
