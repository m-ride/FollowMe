import './styles/tokens.css';
import './styles/app.css';
import { refreshIcons } from './icons';
import { startRouter } from './router';
import { renderHome } from './screens/home';
import { renderNuevoGasto } from './screens/nuevoGasto';
import { renderDetalleRubro } from './screens/detalleRubro';
import { renderNuevaCompraMSI } from './screens/nuevaCompraMSI';
import { renderMSI } from './screens/msi';
import { renderAhorro } from './screens/ahorro';
import { renderMetodos } from './screens/metodos';
import { renderGastos } from './screens/gastos';

const app = document.querySelector<HTMLDivElement>('#app')!;

startRouter(
  [
    { path: '/', render: renderHome },
    { path: '/gastos', render: renderGastos },
    { path: '/gastos/nuevo', render: renderNuevoGasto },
    { path: '/rubro', render: renderDetalleRubro },
    { path: '/msi', render: renderMSI },
    { path: '/msi/nuevo', render: renderNuevaCompraMSI },
    { path: '/ahorro', render: renderAhorro },
    { path: '/metodos', render: renderMetodos },
  ],
  app,
  refreshIcons
);
