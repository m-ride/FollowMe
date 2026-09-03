import { getResumen, getRubros, actualizarRubro, borrarRubro } from '../../api';
import { money, esc } from '../../format';
import { refreshIcons } from '../../icons';

export async function renderPresupuesto(root: HTMLElement) {
  root.innerHTML = `<div class="placeholder">Cargando…</div>`;

  const [resumen, rubros] = await Promise.all([getResumen(), getRubros()]);

  const filaGasto = (id: number, nombre: string, clasificacion: string | undefined, aportado: number, gastado: number, disponible: number) => `
    <tr data-id="${id}">
      <td class="editable"><input class="input-nombre" value="${esc(nombre)}" /></td>
      <td>
        <select class="input-clasif">
          <option value="" ${!clasificacion ? 'selected' : ''}>—</option>
          <option value="fijo" ${clasificacion === 'fijo' ? 'selected' : ''}>Fijo</option>
          <option value="discrecional" ${clasificacion === 'discrecional' ? 'selected' : ''}>Discrecional</option>
        </select>
      </td>
      <td class="num">${money(aportado)}</td>
      <td class="num">${money(gastado)}</td>
      <td class="num" style="color:${disponible < 0 ? 'var(--status-error)' : 'inherit'}">${money(disponible)}</td>
      <td><span class="chico" data-status></span></td>
      <td><button type="button" class="icon-btn btn-borrar-rubro" data-id="${id}" style="width:28px;height:28px"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td>
    </tr>`;

  const filasGasto = resumen.rubros
    .map((r) => filaGasto(r.id, r.nombre, r.clasificacion, r.aportaciones.reduce((s, a) => s + a.monto, 0), r.gastado + r.cuotas_msi, r.disponible))
    .join('');

  const filaAhorro = (id: number, nombre: string, saldo: number, meta: number | undefined, esFondo: boolean) => `
    <tr data-id="${id}">
      <td class="editable"><input class="input-nombre" value="${esc(nombre)}" /></td>
      <td class="editable"><input class="input-meta" type="number" step="0.01" min="0" value="${meta ? (meta / 100).toFixed(2) : ''}" placeholder="sin meta" /></td>
      <td class="num">${money(saldo)}</td>
      <td style="text-align:center"><input type="checkbox" class="input-fondo" ${esFondo ? 'checked' : ''} /></td>
      <td><span class="chico" data-status></span></td>
      <td><button type="button" class="icon-btn btn-borrar-rubro" data-id="${id}" style="width:28px;height:28px"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button></td>
    </tr>`;

  const filasAhorro = resumen.ahorro
    .map((b) => filaAhorro(b.id, b.nombre, b.saldo, b.monto_objetivo, b.es_fondo_emergencia ?? false))
    .join('');

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="desktop-titulo" style="margin-bottom:0">Presupuesto</div>
      <div style="display:flex;gap:8px">
        <a href="#/rubro/nuevo" class="btn-fantasma" style="width:auto;padding:8px 16px"><i data-lucide="plus" style="width:16px;height:16px;"></i>Nueva categoría</a>
        <a href="#/rubro/nuevo?tipo=ahorro" class="btn-fantasma" style="width:auto;padding:8px 16px"><i data-lucide="plus" style="width:16px;height:16px;"></i>Nueva bolsa</a>
      </div>
    </div>
    <div class="seccion-label"><span>&lt;rubros de gasto&gt; · ${resumen.periodo}</span></div>
    <div class="tabla-wrap">
      <table class="tabla">
        <thead><tr><th>Nombre</th><th>Clasificación</th><th>Aportado</th><th>Gastado</th><th>Disponible</th><th></th><th></th></tr></thead>
        <tbody>${filasGasto || '<tr><td colspan="7"><div class="placeholder">Sin rubros todavía</div></td></tr>'}</tbody>
      </table>
    </div>

    <div class="seccion-label"><span>&lt;bolsas de ahorro&gt;</span></div>
    <div class="tabla-wrap">
      <table class="tabla">
        <thead><tr><th>Nombre</th><th>Meta</th><th>Saldo</th><th>Fondo emergencia</th><th></th><th></th></tr></thead>
        <tbody>${filasAhorro || '<tr><td colspan="6"><div class="placeholder">Sin bolsas todavía</div></td></tr>'}</tbody>
      </table>
    </div>
  `;
  refreshIcons();

  // El backend hace un UPDATE incondicional de las 4 columnas editables (no un PATCH
  // parcial por campo) — cada guardado debe reenviar el estado completo de la fila tal
  // como está en el DOM ahora mismo, o un campo no tocado en este guardado se borraría.
  root.querySelectorAll<HTMLTableRowElement>('tbody tr[data-id]').forEach((tr) => {
    const id = Number(tr.dataset.id);
    if (!rubros.find((r) => r.id === id)) return;

    const inputNombre = tr.querySelector<HTMLInputElement>('.input-nombre')!;
    const inputClasif = tr.querySelector<HTMLSelectElement>('.input-clasif');
    const inputMeta = tr.querySelector<HTMLInputElement>('.input-meta');
    const inputFondo = tr.querySelector<HTMLInputElement>('.input-fondo');
    const status = tr.querySelector<HTMLSpanElement>('[data-status]')!;

    const guardarFila = async () => {
      const nombre = inputNombre.value.trim();
      if (!nombre) return;
      try {
        await actualizarRubro(id, {
          nombre,
          clasificacion: (inputClasif?.value as 'fijo' | 'discrecional' | '') || undefined,
          monto_objetivo: inputMeta?.value ? Math.round(parseFloat(inputMeta.value) * 100) : undefined,
          es_fondo_emergencia: inputFondo?.checked ?? false,
        });
        status.textContent = 'guardado';
        status.style.color = 'var(--status-ok)';
      } catch (err) {
        status.textContent = (err as Error).message.slice(0, 60);
        status.style.color = 'var(--status-error)';
      }
    };

    inputNombre.addEventListener('blur', guardarFila);
    inputClasif?.addEventListener('change', guardarFila);
    inputMeta?.addEventListener('blur', guardarFila);
    inputFondo?.addEventListener('change', async () => {
      await guardarFila();
      renderPresupuesto(root);
    });
  });

  root.querySelectorAll<HTMLButtonElement>('.btn-borrar-rubro').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const nombre = root.querySelector<HTMLInputElement>(`tr[data-id="${btn.dataset.id}"] .input-nombre`)?.value ?? '';
      if (!confirm(`¿Borrar "${nombre}"? Se perderán sus aportaciones registradas; sus gastos y compras MSI se quedarán sin rubro (los verás en Pendientes).`)) return;
      try {
        await borrarRubro(Number(btn.dataset.id));
        await renderPresupuesto(root);
        refreshIcons();
      } catch (err) {
        alert((err as Error).message);
      }
    });
  });
}
