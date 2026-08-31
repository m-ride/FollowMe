import { renderNav } from '../nav';

export const renderPlaceholder = (activo: string, titulo: string) => (root: HTMLElement) => {
  root.innerHTML = `
    <div class="screen">
      <div class="topbar"><div class="titulo">${titulo}</div></div>
      <div class="placeholder">Todavía no está — próxima pantalla a construir.</div>
    </div>
    ${renderNav(activo)}
  `;
};
