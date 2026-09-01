import { renderDashboard } from './screens/dashboard';
import { renderMovimientos } from './screens/movimientos';
import { renderPresupuesto } from './screens/presupuesto';
import { renderMSIEscritorio } from './screens/msi';
import { renderSalud } from '../screens/salud';
import { renderMetodos } from '../screens/metodos';
import { renderDatos } from '../screens/datos';
import { renderDetalleRubro } from '../screens/detalleRubro';
import { renderNuevoGasto } from '../screens/nuevoGasto';
import { renderNuevoRubro } from '../screens/nuevoRubro';
import { renderNuevaCompraMSI } from '../screens/nuevaCompraMSI';

export const NAV_ITEMS = [
  { path: '/', icon: 'house', label: 'Dashboard' },
  { path: '/movimientos', icon: 'receipt-text', label: 'Movimientos' },
  { path: '/presupuesto', icon: 'tag', label: 'Presupuesto' },
  { path: '/msi', icon: 'credit-card', label: 'MSI' },
  { path: '/salud', icon: 'heart-pulse', label: 'Salud' },
  { path: '/metodos', icon: 'landmark', label: 'Métodos de pago' },
  { path: '/datos', icon: 'download', label: 'Datos' },
];

export const desktopRoutes = [
  { path: '/', render: renderDashboard },
  { path: '/movimientos', render: renderMovimientos },
  { path: '/presupuesto', render: renderPresupuesto },
  { path: '/msi', render: renderMSIEscritorio },
  { path: '/salud', render: renderSalud },
  { path: '/metodos', render: renderMetodos },
  { path: '/datos', render: renderDatos },
  { path: '/rubro', render: renderDetalleRubro },
  { path: '/rubro/nuevo', render: renderNuevoRubro },
  { path: '/gastos/nuevo', render: renderNuevoGasto },
  { path: '/msi/nuevo', render: renderNuevaCompraMSI },
];
