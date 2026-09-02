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
import { renderDatos } from './screens/datos';
import { renderPendientes } from './screens/pendientes';

const app = document.querySelector<HTMLDivElement>('#app')!;

// Fase 4: panel de escritorio. Se decide una sola vez al cargar la página — no hay
// remount en vivo al cruzar el breakpoint, solo un reload (ver el listener abajo).
// Es una herramienta personal, no un producto público: un reload al undockear la
// laptop o rotar la tablet es una concesión aceptable frente a la complejidad de un
// remount en caliente.
const esEscritorio = matchMedia('(min-width: 900px)').matches;
if (esEscritorio) document.body.dataset.mode = 'desktop';

function iniciar() {
  if (esEscritorio) {
    import('./styles/desktop.css');
    import('./desktop/shell').then(({ iniciarEscritorio }) => iniciarEscritorio(app));
    return;
  }
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
      { path: '/pendientes', render: renderPendientes },
      { path: '/datos', render: renderDatos },
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

matchMedia('(min-width: 900px)').addEventListener('change', () => location.reload());

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

// Un <input type="number"> enfocado captura la rueda del mouse/trackpad y cambia su
// valor en vez de dejar hacer scroll a la página — quitarle el foco al primer scroll
// deja que el gesto se comporte como scroll normal.
document.addEventListener(
  'wheel',
  () => {
    const activo = document.activeElement;
    if (activo instanceof HTMLInputElement && activo.type === 'number') activo.blur();
  },
  { passive: true }
);
