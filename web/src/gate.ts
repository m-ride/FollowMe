import { supabase } from './supabase';
import { refreshIcons } from './icons';

// supabase-js persiste la sesión sola (localStorage + refresh automático) — a
// diferencia del candado viejo, aquí solo se pregunta si ya hay una sesión viva.
export async function tieneSesion(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return data.session !== null;
}

export function renderLogin(root: HTMLElement, onOk: () => void) {
  root.innerHTML = `
    <div class="screen" style="display:flex;flex-direction:column;justify-content:center;align-items:center;padding:0 32px">
      <div style="width:56px;height:56px;border-radius:16px;background:var(--navy);display:flex;align-items:center;justify-content:center;margin-bottom:20px">
        <i data-lucide="lock" style="width:26px;height:26px;color:var(--cream)"></i>
      </div>
      <div style="font-family:var(--font-display);font-weight:700;font-size:22px;margin-bottom:6px;text-align:center">Finanzas</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:24px;text-align:center">Inicia sesión</div>
      <form id="fg" style="width:100%;max-width:320px">
        <div class="campo"><input id="email" type="email" placeholder="Correo" autocomplete="username" required /></div>
        <div class="campo" style="margin-top:10px"><input id="password" type="password" placeholder="Contraseña" autocomplete="current-password" required /></div>
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
    const email = root.querySelector<HTMLInputElement>('#email')!.value.trim();
    const password = root.querySelector<HTMLInputElement>('#password')!.value;
    btn.disabled = true;
    btn.textContent = 'Entrando…';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      onOk();
    } else {
      errorEl.textContent = 'Correo o contraseña incorrectos.';
      errorEl.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });
}
