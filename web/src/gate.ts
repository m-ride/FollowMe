import { API_URL, getToken, setToken } from './config';
import { refreshIcons } from './icons';

export const tieneAcceso = (): boolean => getToken() !== null;

async function validar(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/rubros`, { headers: { Authorization: `Bearer ${token}` } });
    return res.ok;
  } catch {
    return false;
  }
}

export function renderCandado(root: HTMLElement, onOk: () => void) {
  root.innerHTML = `
    <div class="screen" style="display:flex;flex-direction:column;justify-content:center;align-items:center;padding:0 32px">
      <div style="width:56px;height:56px;border-radius:16px;background:var(--navy);display:flex;align-items:center;justify-content:center;margin-bottom:20px">
        <i data-lucide="lock" style="width:26px;height:26px;color:var(--cream)"></i>
      </div>
      <div style="font-family:var(--font-display);font-weight:700;font-size:22px;margin-bottom:6px;text-align:center">Finanzas</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:24px;text-align:center">Ingresa el código de acceso</div>
      <form id="fg" style="width:100%;max-width:320px">
        <div class="campo"><input id="codigo" type="password" placeholder="Código de acceso" autocomplete="current-password" required style="text-align:center;letter-spacing:0.05em" /></div>
        <div class="error-msg" id="error-gate" hidden style="text-align:center"></div>
        <button class="btn-primario" type="submit" style="margin-top:12px">Entrar</button>
      </form>
    </div>
  `;
  refreshIcons();

  const form = root.querySelector<HTMLFormElement>('#fg')!;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector<HTMLButtonElement>('button')!;
    const errorEl = root.querySelector<HTMLDivElement>('#error-gate')!;
    errorEl.hidden = true;
    const codigo = (root.querySelector<HTMLInputElement>('#codigo')!).value.trim();
    if (!codigo) return;
    btn.disabled = true;
    btn.textContent = 'Verificando…';
    if (await validar(codigo)) {
      setToken(codigo);
      onOk();
    } else {
      errorEl.textContent = 'Código incorrecto.';
      errorEl.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });
}
