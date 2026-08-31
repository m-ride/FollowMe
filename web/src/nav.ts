const ITEMS = [
  { path: '/', icon: 'house', label: 'Inicio' },
  { path: '/gastos', icon: 'receipt-text', label: 'Gastos' },
  { path: '/msi', icon: 'credit-card', label: 'MSI' },
  { path: '/ahorro', icon: 'piggy-bank', label: 'Ahorro' },
];

const ACCIONES = [
  { href: '#/gastos/nuevo', icon: 'receipt-text', label: 'Nuevo gasto' },
  { href: '#/salud?nuevo=1', icon: 'banknote', label: 'Nuevo ingreso' },
  { href: '#/rubro/nuevo', icon: 'tag', label: 'Nueva categoría' },
  { href: '#/rubro/nuevo?tipo=ahorro', icon: 'piggy-bank', label: 'Nueva bolsa de ahorro' },
  { href: '#/msi/nuevo', icon: 'credit-card', label: 'Compra a meses' },
];

export const renderNav = (activo: string): string => {
  const [antes, despues] = [ITEMS.slice(0, 2), ITEMS.slice(2)];
  const item = (it: (typeof ITEMS)[number]) => `
    <a href="#${it.path}" class="nav-item ${it.path === activo ? 'activo' : ''}">
      <i data-lucide="${it.icon}" style="width:22px;height:22px;"></i><span>${it.label}</span>
    </a>`;
  return `
  <nav class="bottom-nav">
    ${antes.map(item).join('')}
    <div class="nav-fab-wrap">
      <div class="fab-menu" id="fab-menu" hidden>
        ${ACCIONES.map((a) => `<a href="${a.href}"><i data-lucide="${a.icon}" style="width:17px;height:17px;"></i>${a.label}</a>`).join('')}
      </div>
      <button type="button" class="nav-fab" id="fab-toggle"><i data-lucide="plus" style="width:26px;height:26px;"></i></button>
    </div>
    ${despues.map(item).join('')}
  </nav>`;
};
