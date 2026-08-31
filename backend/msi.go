package main

import "time"

// Cuota es una cuota generada, aún sin id.
type Cuota struct {
	Numero      int       `json:"numero_cuota"`
	Monto       int64     `json:"monto"`
	Vencimiento time.Time `json:"fecha_vencimiento"`
}

// generarCuotas reparte montoTotal (en centavos) en plazo cuotas y las agenda
// según el ciclo de la tarjeta: la compra cae en el corte de este mes si ocurrió
// en o antes del día de corte, si no cae en el siguiente; el pago de ese corte
// es en el mismo mes cuando diaPago > diaCorte, si no al mes siguiente.
// El sobrante de la división se carga a las primeras cuotas, así SUM == montoTotal.
func generarCuotas(montoTotal int64, plazo int, fechaCompra time.Time, diaCorte, diaPago int) []Cuota {
	base, resto := montoTotal/int64(plazo), montoTotal%int64(plazo)

	corte := mesDe(fechaCompra)
	if fechaCompra.Day() > diaCorte {
		corte = corte.AddDate(0, 1, 0)
	}
	primerPago := corte
	if diaPago <= diaCorte {
		primerPago = primerPago.AddDate(0, 1, 0)
	}

	cuotas := make([]Cuota, plazo)
	for i := range cuotas {
		monto := base
		if int64(i) < resto {
			monto++
		}
		cuotas[i] = Cuota{
			Numero:      i + 1,
			Monto:       monto,
			Vencimiento: enDia(primerPago.AddDate(0, i, 0), diaPago),
		}
	}
	return cuotas
}

func mesDe(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
}

// enDia fija el día del mes recortando al último día si el mes es más corto
// (día 31 en febrero -> 28/29), en vez de desbordar al mes siguiente.
func enDia(mes time.Time, dia int) time.Time {
	ultimo := mes.AddDate(0, 1, -1).Day()
	return time.Date(mes.Year(), mes.Month(), min(dia, ultimo), 0, 0, 0, 0, time.UTC)
}
