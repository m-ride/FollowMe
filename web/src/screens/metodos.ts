import { getMetodos, getResumen, crearMetodo, actualizarMetodo, type MetodoPago } from '../api';
import { money, esc } from '../format';
import { iconoMetodo, refreshIcons } from '../icons';
import { topbarBack } from '../chrome';

export async function renderMetodos(root: HTMLElement) {
  root.innerHTML = `<div class="screen">${topbarBack('Métodos de pago', '/')}<div class="placeholder">Cargando…</div></div>`;

  const [metodos, resumen] = await Promise.all([getMetodos(), getResumen()]);
  const tarjetas = metodos.filter((m) => m.tipo === 'credito');
  const otros = metodos.filter((m) => m.tipo !== 'credito');

  const editarBtn = (id: number) =>
    `<button type="button" class="icon-btn btn-editar" data-id="${id}" style="width:32px;height:32px;flex-shrink:0"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>`;

  const formEditarTarjeta = (m: MetodoPago) => `
    <div class="inline-form" data-editar="${m.id}" hidden>
      <form class="form-editar" data-id="${m.id}">
        <div class="campo"><div class="k">Nombre</div><input class="input-nombre" type="text" value="${esc(m.nombre)}" required /></div>
        <div style="display:flex;gap:12px">
          <div class="campo" style="flex:1"><div class="k">Límite</div><input class="input-limite" type="number" step="0.01" min="0" value="${m.limite ? (m.limite / 100).toFixed(2) : ''}" /></div>
          <div class="campo" style="flex:1"><div class="k">Día de corte</div><input class="input-corte" type="number" min="1" max="31" value="${m.dia_corte ?? ''}" /></div>
          <div class="campo" style="flex:1"><div class="k">Día de pago</div><input class="input-pago" type="number" min="1" max="31" value="${m.dia_pago ?? ''}" /></div>
        </div>
        <button class="btn-primario" type="submit"><i data-lucide="check" style="width:19px;height:19px;"></i>Guardar</button>
      </form>
    </div>`;

  const formEditarSimple = (m: MetodoPago) => `
    <div class="inline-form" data-editar="${m.id}" hidden>
      <form class="form-editar" data-id="${m.id}">
        <div class="campo"><div class="k">Nombre</div><input class="input-nombre" type="text" value="${esc(m.nombre)}" required /></div>
        <button class="btn-primario" type="submit"><i data-lucide="check" style="width:19px;height:19px;"></i>Guardar</button>
      </form>
    </div>`;

  const tarjetaHtml = (m: MetodoPago) => {
    const salud = resumen.tarjetas.find((t) => t.id === m.id);
    const color = !salud ? '' : salud.pct_utilizacion >= 80 ? 'error' : salud.pct_utilizacion >= 50 ? 'warn' : '';
    return `
    <div class="metodo-card">
      <div class="fila">
        <div class="icono"><i data-lucide="credit-card" style="width:20px;height:20px;"></i></div>
        <div class="info">
          <div class="nombre">${esc(m.nombre)}</div>
          <div class="sub">corte ${m.dia_corte} · pago ${m.dia_pago}</div>
        </div>
        ${salud ? `<div class="saldo"><div class="v">${money(salud.saldo_actual)}</div><div class="k">saldo</div></div>` : ''}
        ${editarBtn(m.id)}
      </div>
      ${
        salud
          ? `<div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-muted);margin-top:14px"><span>Utilización</span><span>${salud.pct_utilizacion.toFixed(0)}% de ${money(salud.limite)}</span></div>
             <div class="progress" style="margin-top:6px"><div class="${color}" style="width:${Math.min(salud.pct_utilizacion, 100)}%"></div></div>`
          : ''
      }
      ${formEditarTarjeta(m)}
    </div>`;
  };

  const otroHtml = (m: MetodoPago) => `
    <div class="metodo-card simple">
      <div class="fila">
        <div class="icono"><i data-lucide="${iconoMetodo(m.tipo)}" style="width:19px;height:19px;"></i></div>
        <div class="info"><div class="nombre">${esc(m.nombre)}</div><div class="sub">${m.tipo === 'debito' ? 'Débito' : 'Sin corte'}</div></div>
        ${editarBtn(m.id)}
      </div>
      ${formEditarSimple(m)}
    </div>`;

  root.innerHTML = `
    <div class="screen">
      ${topbarBack('Métodos de pago', '/')}
      <div class="seccion-label"><span>&lt;tarjetas de crédito&gt;</span></div>
      <div class="rubro-list">${tarjetas.map(tarjetaHtml).join('') || '<div class="placeholder">Sin tarjetas todavía</div>'}</div>
      <div class="seccion-label"><span>&lt;otros métodos&gt;</span></div>
      <div class="rubro-list">${otros.map(otroHtml).join('') || '<div class="placeholder">Sin otros métodos todavía</div>'}</div>

      <button id="toggle-agregar" class="btn-fantasma" style="margin-top:var(--space-5)">
        <i data-lucide="plus" style="width:18px;height:18px;"></i>Agregar método
      </button>
      <div id="form-agregar" class="inline-form" hidden>
        <form id="f">
          <div class="campo">
            <div class="k">Nombre</div>
            <input id="nombre" type="text" placeholder="Ej. BBVA Azul" required />
          </div>
          <div class="campo">
            <div class="k">Tipo</div>
            <div class="pills" id="pills-tipo">
              <span class="pill activa" data-t="efectivo">Efectivo</span>
              <span class="pill" data-t="debito">Débito</span>
              <span class="pill" data-t="credito">Crédito</span>
            </div>
          </div>
          <div id="campos-credito" hidden>
            <div style="display:flex;gap:12px">
              <div class="campo" style="flex:1"><div class="k">Límite</div><input id="limite" type="number" step="0.01" min="0" /></div>
              <div class="campo" style="flex:1"><div class="k">Día de corte</div><input id="dia_corte" type="number" min="1" max="31" /></div>
              <div class="campo" style="flex:1"><div class="k">Día de pago</div><input id="dia_pago" type="number" min="1" max="31" /></div>
            </div>
          </div>
          <div class="error-msg" id="error" hidden></div>
          <button class="btn-primario" type="submit"><i data-lucide="check" style="width:19px;height:19px;"></i>Guardar método</button>
        </form>
      </div>
    </div>
  `;
  refreshIcons();

  root.querySelectorAll<HTMLButtonElement>('.btn-editar').forEach((btn) => {
    btn.addEventListener('click', () => {
      const el = root.querySelector<HTMLDivElement>(`[data-editar="${btn.dataset.id}"]`)!;
      el.hidden = !el.hidden;
    });
  });
  root.querySelectorAll<HTMLFormElement>('.form-editar').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = Number(form.dataset.id);
      const nombre = form.querySelector<HTMLInputElement>('.input-nombre')!.value.trim();
      if (!nombre) return;
      const limiteEl = form.querySelector<HTMLInputElement>('.input-limite');
      try {
        await actualizarMetodo(id, {
          nombre,
          ...(limiteEl
            ? {
                limite: Math.round(parseFloat(limiteEl.value || '0') * 100),
                dia_corte: Number(form.querySelector<HTMLInputElement>('.input-corte')!.value),
                dia_pago: Number(form.querySelector<HTMLInputElement>('.input-pago')!.value),
              }
            : {}),
        });
        await renderMetodos(root);
        refreshIcons();
      } catch (err) {
        alert((err as Error).message);
      }
    });
  });

  let tipo: MetodoPago['tipo'] = 'efectivo';
  const formWrap = root.querySelector<HTMLDivElement>('#form-agregar')!;
  const camposCredito = root.querySelector<HTMLDivElement>('#campos-credito')!;
  root.querySelector('#toggle-agregar')!.addEventListener('click', () => {
    formWrap.hidden = !formWrap.hidden;
  });
  root.querySelector('#pills-tipo')!.addEventListener('click', (e) => {
    const p = (e.target as HTMLElement).closest<HTMLElement>('.pill');
    if (!p) return;
    tipo = p.dataset.t as MetodoPago['tipo'];
    root.querySelectorAll('#pills-tipo .pill').forEach((el) => el.classList.toggle('activa', el === p));
    camposCredito.hidden = tipo !== 'credito';
  });
  root.querySelector<HTMLFormElement>('#f')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = root.querySelector<HTMLDivElement>('#error')!;
    errorEl.hidden = true;
    const nombre = (root.querySelector<HTMLInputElement>('#nombre')!).value.trim();
    if (!nombre) {
      errorEl.textContent = 'Falta el nombre.';
      errorEl.hidden = false;
      return;
    }
    const limiteStr = (root.querySelector<HTMLInputElement>('#limite')!).value;
    const diaCorteStr = (root.querySelector<HTMLInputElement>('#dia_corte')!).value;
    const diaPagoStr = (root.querySelector<HTMLInputElement>('#dia_pago')!).value;
    try {
      await crearMetodo({
        nombre,
        tipo,
        ...(tipo === 'credito'
          ? {
              limite: Math.round(parseFloat(limiteStr || '0') * 100),
              dia_corte: Number(diaCorteStr),
              dia_pago: Number(diaPagoStr),
            }
          : {}),
      });
      await renderMetodos(root);
      refreshIcons();
    } catch (err) {
      errorEl.textContent = (err as Error).message;
      errorEl.hidden = false;
    }
  });
}
