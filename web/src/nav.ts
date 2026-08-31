const ITEMS = [
  { path: '/', icon: 'house', label: 'Inicio' },
  { path: '/gastos', icon: 'receipt-text', label: 'Gastos' },
  { path: '/gastos/nuevo', icon: 'plus', label: '', fab: true },
  { path: '/msi', icon: 'credit-card', label: 'MSI' },
  { path: '/ahorro', icon: 'piggy-bank', label: 'Ahorro' },
];

export const renderNav = (activo: string): string => `
  <nav class="bottom-nav">
    ${ITEMS.map((it) =>
      it.fab
        ? `<a href="#${it.path}" class="nav-fab"><i data-lucide="${it.icon}" style="width:26px;height:26px;"></i></a>`
        : `<a href="#${it.path}" class="nav-item ${it.path === activo ? 'activo' : ''}">
             <i data-lucide="${it.icon}" style="width:22px;height:22px;"></i><span>${it.label}</span>
           </a>`
    ).join('')}
  </nav>`;
