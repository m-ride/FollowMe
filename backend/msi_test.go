package main

import (
	"testing"
	"time"
)

func fecha(s string) time.Time {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		panic(err)
	}
	return t
}

func TestGenerarCuotas(t *testing.T) {
	// 1000.00 en 3 MSI: el sobrante va a las primeras cuotas, la suma cuadra.
	c := generarCuotas(100000, 3, fecha("2026-01-10"), 15, 20)
	var suma int64
	for _, x := range c {
		suma += x.Monto
	}
	if suma != 100000 {
		t.Fatalf("suma %d != 100000", suma)
	}
	if c[0].Monto != 33334 || c[2].Monto != 33333 {
		t.Fatalf("reparto raro: %+v", c)
	}
	// compra antes del corte (10 <= 15) -> corte enero, pago enero (20 > 15).
	if got := c[0].Vencimiento.Format("2006-01-02"); got != "2026-01-20" {
		t.Fatalf("primer vencimiento %s", got)
	}
	if got := c[2].Vencimiento.Format("2006-01-02"); got != "2026-03-20" {
		t.Fatalf("tercer vencimiento %s", got)
	}

	// compra después del corte -> se va al corte siguiente.
	d := generarCuotas(100, 1, fecha("2026-01-16"), 15, 20)
	if got := d[0].Vencimiento.Format("2006-01-02"); got != "2026-02-20" {
		t.Fatalf("post-corte %s", got)
	}

	// pago antes del corte -> el pago del corte cae al mes siguiente.
	e := generarCuotas(100, 1, fecha("2026-01-05"), 20, 5)
	if got := e[0].Vencimiento.Format("2006-01-02"); got != "2026-02-05" {
		t.Fatalf("pago-antes-corte %s", got)
	}

	// día 31 en un mes corto se recorta, no se desborda a marzo.
	f := generarCuotas(300, 3, fecha("2025-12-01"), 5, 31)
	if got := f[2].Vencimiento.Format("2006-01-02"); got != "2026-02-28" {
		t.Fatalf("clamp febrero %s", got)
	}
}
