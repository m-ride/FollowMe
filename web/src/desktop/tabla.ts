// Tabla densa ordenable compartida por Movimientos/Presupuesto/MSI en escritorio.
// El ordenamiento es puro cliente (sin refetch): activarOrden reordena el arreglo ya
// cargado y solo reemplaza el <tbody>, no vuelve a pedir datos a la API.
export interface Columna<T> {
  clave: string;
  etiqueta: string;
  num?: boolean;
  valor: (fila: T) => string;
  orden?: (fila: T) => number | string;
}

const filaHtml = <T,>(columnas: Columna<T>[], fila: T): string =>
  `<tr>${columnas.map((c) => `<td class="${c.num ? 'num' : ''}">${c.valor(fila)}</td>`).join('')}</tr>`;

export function renderTabla<T>(columnas: Columna<T>[], filas: T[], tablaId: string): string {
  const ths = columnas
    .map((c) => `<th data-clave="${c.clave}">${c.etiqueta}<span class="flecha"></span></th>`)
    .join('');
  const filasHtml = filas.map((f) => filaHtml(columnas, f)).join('');
  return `
    <div class="tabla-wrap">
      <table class="tabla" id="${tablaId}">
        <thead><tr>${ths}</tr></thead>
        <tbody>${filasHtml || `<tr><td colspan="${columnas.length}"><div class="placeholder">Sin datos</div></td></tr>`}</tbody>
      </table>
    </div>`;
}

export function activarOrden<T>(root: HTMLElement, tablaId: string, columnas: Columna<T>[], filas: T[]): void {
  const tabla = root.querySelector<HTMLTableElement>(`#${tablaId}`);
  if (!tabla) return;
  const tbody = tabla.querySelector('tbody')!;
  let claveActual = '';
  let asc = true;

  tabla.querySelectorAll<HTMLTableCellElement>('th').forEach((th) => {
    th.addEventListener('click', () => {
      const clave = th.dataset.clave!;
      asc = claveActual === clave ? !asc : true;
      claveActual = clave;
      const columna = columnas.find((c) => c.clave === clave)!;
      const claveFn = columna.orden ?? columna.valor;
      const ordenadas = [...filas].sort((a, b) => {
        const va = claveFn(a);
        const vb = claveFn(b);
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return asc ? cmp : -cmp;
      });
      tabla.querySelectorAll('.flecha').forEach((f) => (f.textContent = ''));
      th.querySelector('.flecha')!.textContent = asc ? ' ↑' : ' ↓';
      tbody.innerHTML = ordenadas.map((f) => filaHtml(columnas, f)).join('') || `<tr><td colspan="${columnas.length}"><div class="placeholder">Sin datos</div></td></tr>`;
    });
  });
}
