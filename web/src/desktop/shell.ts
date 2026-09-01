import { startRouter } from '../router';
import { refreshIcons } from '../icons';
import { desktopRoutes, NAV_ITEMS } from './routes';

function marcarActivo(root: HTMLElement) {
  const path = location.hash.slice(1).split('?')[0] || '/';
  root.querySelectorAll<HTMLAnchorElement>('.desktop-nav-item').forEach((a) => {
    a.classList.toggle('activo', a.dataset.path === path);
  });
}

export function iniciarEscritorio(root: HTMLElement) {
  root.innerHTML = `
    <aside class="desktop-sidebar">
      <div class="desktop-brand">Finanzas</div>
      <nav>
        ${NAV_ITEMS.map(
          (it) => `
          <a href="#${it.path}" class="desktop-nav-item" data-path="${it.path}">
            <i data-lucide="${it.icon}" style="width:18px;height:18px;"></i>${it.label}
          </a>`
        ).join('')}
      </nav>
    </aside>
    <div id="desktop-content" class="desktop-content"></div>
  `;
  refreshIcons();
  marcarActivo(root);

  const content = root.querySelector<HTMLDivElement>('#desktop-content')!;
  startRouter(desktopRoutes, content, () => {
    refreshIcons();
    marcarActivo(root);
  });
}
