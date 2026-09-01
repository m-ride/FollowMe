import type { Resumen } from './api';
import { esc } from './format';

export type Alerta = { nivel: 'warn' | 'error'; texto: string; href: string };

// Umbrales únicos, ya usados y coloreados hoy en home.ts/salud.ts — se centralizan
// aquí para que un cambio no deje dos criterios distintos para la misma métrica.
export const UMBRAL_MSI_WARN = 20;
export const UMBRAL_MSI_ERROR = 30;
export const UMBRAL_UTILIZACION_WARN = 50;
export const UMBRAL_UTILIZACION_ERROR = 80;
export const UMBRAL_RUBRO_WARN = 90;
export const UMBRAL_RUBRO_ERROR = 100;

export function calcularAlertas(r: Resumen): Alerta[] {
  const alertas: Alerta[] = [];

  const msi = r.salud.pct_ingreso_comprometido_msi;
  if (msi !== undefined && msi >= UMBRAL_MSI_WARN) {
    alertas.push({
      nivel: msi >= UMBRAL_MSI_ERROR ? 'error' : 'warn',
      texto: `Compromiso MSI en ${msi.toFixed(0)}% del ingreso — meta: no pasar de 20-30%`,
      href: '#/salud',
    });
  }

  for (const t of r.tarjetas) {
    if (t.pct_utilizacion >= UMBRAL_UTILIZACION_WARN) {
      alertas.push({
        nivel: t.pct_utilizacion >= UMBRAL_UTILIZACION_ERROR ? 'error' : 'warn',
        texto: `${t.nombre} al ${t.pct_utilizacion.toFixed(0)}% de utilización`,
        href: '#/metodos',
      });
    }
  }

  for (const x of r.rubros) {
    const total = x.aportado_yo + x.aportado_pareja;
    const usado = x.gastado + x.cuotas_msi;
    const pct = total > 0 ? (usado / total) * 100 : 0;
    if (pct >= UMBRAL_RUBRO_WARN) {
      alertas.push({
        nivel: pct >= UMBRAL_RUBRO_ERROR ? 'error' : 'warn',
        texto: `${x.nombre} ${pct >= UMBRAL_RUBRO_ERROR ? 'sobrepasado' : 'casi al límite'} (${pct.toFixed(0)}%)`,
        href: `#/rubro?id=${x.id}`,
      });
    }
  }

  return alertas.sort((a) => (a.nivel === 'error' ? -1 : 1));
}

export const renderAlertasBanner = (alertas: Alerta[]): string =>
  alertas.length === 0
    ? ''
    : `<div class="alerta-banner">${alertas
        .map(
          (a) => `
        <a href="${a.href}" class="${a.nivel}">
          <i data-lucide="triangle-alert" style="width:17px;height:17px;"></i>
          <span>${esc(a.texto)}</span>
        </a>`
        )
        .join('')}</div>`;
