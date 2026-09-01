import { getExport, importarDatos, type Respaldo } from '../api';
import { topbarBack } from '../chrome';
import { refreshIcons } from '../icons';
import { exportarMovimientosCSV, descargar } from '../csv';

export async function renderDatos(root: HTMLElement) {
  root.innerHTML = `
    <div class="screen">
      ${topbarBack('Datos', '/')}
      <div class="seccion-label"><span>&lt;respaldo&gt;</span></div>
      <div class="stat-box">
        <p class="chico">Descarga todos tus datos en un solo archivo, o restaura un respaldo anterior. Restaurar reemplaza TODOS los datos actuales.</p>
        <button type="button" id="btn-exportar-json" class="btn-fantasma" style="margin-top:var(--space-3);width:100%">
          <i data-lucide="download" style="width:18px;height:18px;"></i>Exportar respaldo (JSON)
        </button>
        <button type="button" id="btn-exportar-csv" class="btn-fantasma" style="margin-top:var(--space-3);width:100%">
          <i data-lucide="table" style="width:18px;height:18px;"></i>Exportar movimientos (CSV)
        </button>
        <label class="btn-fantasma" style="margin-top:var(--space-3);width:100%;display:flex;justify-content:center;cursor:pointer">
          <i data-lucide="upload" style="width:18px;height:18px;"></i>Restaurar respaldo
          <input type="file" id="input-restaurar" accept="application/json" hidden />
        </label>
        <div class="error-msg" id="error-datos" hidden></div>
      </div>
    </div>`;
  refreshIcons();

  root.querySelector('#btn-exportar-json')!.addEventListener('click', async () => {
    const data = await getExport();
    descargar(JSON.stringify(data, null, 2), `followme-respaldo-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  });
  root.querySelector('#btn-exportar-csv')!.addEventListener('click', () => exportarMovimientosCSV());

  const errorEl = root.querySelector<HTMLDivElement>('#error-datos')!;
  root.querySelector<HTMLInputElement>('#input-restaurar')!.addEventListener('change', async (e) => {
    errorEl.hidden = true;
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!confirm('Esto reemplaza TODOS tus datos actuales. ¿Seguro?')) {
      input.value = '';
      return;
    }
    try {
      const data = JSON.parse(await file.text()) as Respaldo;
      await importarDatos(data);
      alert('Respaldo restaurado.');
      location.hash = '#/';
    } catch (err) {
      errorEl.textContent = (err as Error).message;
      errorEl.hidden = false;
    } finally {
      input.value = '';
    }
  });
}
