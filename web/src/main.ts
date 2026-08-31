import './styles/tokens.css';
import './styles/app.css';
import { refreshIcons } from './icons';
import { tieneAcceso, renderCandado } from './gate';
import { startRouter } from './router';
import { renderHome } from './screens/home';
import { renderNuevoGasto } from './screens/nuevoGasto';
import { renderDetalleRubro } from './screens/detalleRubro';
import { renderNuevoRubro } from './screens/nuevoRubro';
import { renderNuevaCompraMSI } from './screens/nuevaCompraMSI';
import { renderMSI } from './screens/msi';
import { renderAhorro } from './screens/ahorro';
import { renderMetodos } from './screens/metodos';
import { renderGastos } from './screens/gastos';
import { renderSalud } from './screens/salud';

const app = document.querySelector<HTMLDivElement>('#app')!;

function iniciar() {
  startRouter(
    [
      { path: '/', render: renderHome },
      { path: '/gastos', render: renderGastos },
      { path: '/gastos/nuevo', render: renderNuevoGasto },
      { path: '/rubro', render: renderDetalleRubro },
      { path: '/rubro/nuevo', render: renderNuevoRubro },
      { path: '/msi', render: renderMSI },
      { path: '/msi/nuevo', render: renderNuevaCompraMSI },
      { path: '/ahorro', render: renderAhorro },
      { path: '/metodos', render: renderMetodos },
      { path: '/salud', render: renderSalud },
    ],
    app,
    refreshIcons
  );
}

if (tieneAcceso()) {
  iniciar();
} else {
  renderCandado(app, iniciar);
}

// El menú del "+" central se maneja aquí (delegación sobre #app) en vez de en cada
// pantalla, porque el nav (con el mismo botón) se repite igual en varias pantallas.
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const menu = app.querySelector<HTMLDivElement>('#fab-menu');
  if (!menu) return;
  if (target.closest('#fab-toggle')) {
    menu.hidden = !menu.hidden;
    return;
  }
  if (!target.closest('#fab-menu')) menu.hidden = true;
});
