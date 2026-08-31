export const topbarBack = (titulo: string, volverA: string, accionDerecha = '') => `
  <div class="topbar-nav">
    <a href="#${volverA}" class="icon-btn"><i data-lucide="chevron-left" style="width:20px;height:20px;"></i></a>
    <span class="titulo">${titulo}</span>
    ${accionDerecha || '<div class="spacer-40"></div>'}
  </div>`;
