import { crearRubro, type Rubro } from '../api';
import { topbarBack } from '../chrome';
import { refreshIcons } from '../icons';

export async function renderNuevoRubro(root: HTMLElement, params: URLSearchParams) {
  let tipo: Rubro['tipo'] = params.get('tipo') === 'ahorro' ? 'ahorro' : 'gasto';
  let clasificacion: Rubro['clasificacion'] | undefined;

  const volverA = () => (tipo === 'ahorro' ? '/ahorro' : '/');

  root.innerHTML = `
    <div class="screen">
      ${topbarBack(tipo === 'ahorro' ? 'Nueva bolsa' : 'Nueva categoría', volverA())}
      <form id="f">
        <div class="campo">
          <div class="k">Tipo</div>
          <div class="pills" id="pills-tipo">
            <span class="pill ${tipo === 'gasto' ? 'activa' : ''}" data-t="gasto">Gasto</span>
            <span class="pill ${tipo === 'ahorro' ? 'activa' : ''}" data-t="ahorro">Ahorro</span>
          </div>
        </div>
        <div class="campo">
          <div class="k">Nombre</div>
          <input id="nombre" type="text" placeholder="${tipo === 'ahorro' ? 'Ej. Viaje a Japón' : 'Ej. Mascotas'}" required />
        </div>
        <div id="campo-meta" ${tipo === 'ahorro' ? '' : 'hidden'}>
          <div class="campo">
            <div class="k">Meta de ahorro (opcional)</div>
            <input id="meta" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0.00" />
          </div>
        </div>
        <div id="campo-clasificacion" ${tipo === 'gasto' ? '' : 'hidden'}>
          <div class="campo">
            <div class="k">Clasificación (opcional)</div>
            <div class="pills" id="pills-clasif">
              <span class="pill ${clasificacion === 'fijo' ? 'activa' : ''}" data-c="fijo">Fijo</span>
              <span class="pill ${clasificacion === 'discrecional' ? 'activa' : ''}" data-c="discrecional">Discrecional</span>
            </div>
          </div>
        </div>
        <div class="error-msg" id="error" hidden></div>
      </form>
    </div>
    <div class="barra-inferior">
      <button form="f" class="btn-primario" type="submit"><i data-lucide="check" style="width:19px;height:19px;"></i>Guardar</button>
    </div>
  `;
  refreshIcons();

  // Los pills nunca hacen un re-render completo del formulario: eso borraría lo que
  // ya se haya escrito en Nombre/Meta. Solo se togglean clases/atributos puntuales.
  const tituloEl = root.querySelector<HTMLSpanElement>('.topbar-nav .titulo')!;
  const volverEl = root.querySelector<HTMLAnchorElement>('.topbar-nav a')!;
  const nombreEl = root.querySelector<HTMLInputElement>('#nombre')!;
  const campoMeta = root.querySelector<HTMLDivElement>('#campo-meta')!;
  const campoClasificacion = root.querySelector<HTMLDivElement>('#campo-clasificacion')!;

  root.querySelector('#pills-tipo')!.addEventListener('click', (e) => {
    const p = (e.target as HTMLElement).closest<HTMLElement>('.pill');
    if (!p) return;
    tipo = p.dataset.t as Rubro['tipo'];
    root.querySelectorAll('#pills-tipo .pill').forEach((el) => el.classList.toggle('activa', el === p));
    campoMeta.hidden = tipo !== 'ahorro';
    campoClasificacion.hidden = tipo !== 'gasto';
    nombreEl.placeholder = tipo === 'ahorro' ? 'Ej. Viaje a Japón' : 'Ej. Mascotas';
    tituloEl.textContent = tipo === 'ahorro' ? 'Nueva bolsa' : 'Nueva categoría';
    volverEl.setAttribute('href', `#${volverA()}`);
  });

  root.querySelector('#pills-clasif')!.addEventListener('click', (e) => {
    const p = (e.target as HTMLElement).closest<HTMLElement>('.pill');
    if (!p) return;
    const c = p.dataset.c as Rubro['clasificacion'];
    clasificacion = clasificacion === c ? undefined : c; // click de nuevo = quitar la clasificación
    root.querySelectorAll('#pills-clasif .pill').forEach((el) => el.classList.toggle('activa', el.getAttribute('data-c') === clasificacion));
  });

  root.querySelector<HTMLFormElement>('#f')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = root.querySelector<HTMLDivElement>('#error')!;
    errorEl.hidden = true;
    const nombre = nombreEl.value.trim();
    if (!nombre) {
      errorEl.textContent = 'Falta el nombre.';
      errorEl.hidden = false;
      return;
    }
    const metaStr = root.querySelector<HTMLInputElement>('#meta')?.value ?? '';
    try {
      await crearRubro({
        nombre,
        tipo,
        ...(tipo === 'ahorro' && metaStr ? { monto_objetivo: Math.round(parseFloat(metaStr) * 100) } : {}),
        ...(tipo === 'gasto' && clasificacion ? { clasificacion } : {}),
      });
      location.hash = tipo === 'ahorro' ? '#/ahorro' : '#/';
    } catch (err) {
      errorEl.textContent = (err as Error).message;
      errorEl.hidden = false;
    }
  });
}
