package main

import (
	"errors"
	"net/http"
	"time"
)

type rubroGasto struct {
	ID             int64  `json:"id"`
	Nombre         string `json:"nombre"`
	AportadoYo     int64  `json:"aportado_yo"`
	AportadoPareja int64  `json:"aportado_pareja"`
	Gastado        int64  `json:"gastado"`
	CuotasMSI      int64  `json:"cuotas_msi"`
	Disponible     int64  `json:"disponible"`
}

type bolsaAhorro struct {
	ID            int64    `json:"id"`
	Nombre        string   `json:"nombre"`
	Saldo         int64    `json:"saldo"`
	MontoObjetivo *int64   `json:"monto_objetivo,omitempty"`
	AvancePct     *float64 `json:"avance_pct,omitempty"`
}

type mesMSI struct {
	Mes        string           `json:"mes"`
	Total      int64            `json:"total"`
	PorTarjeta []compromisoTarj `json:"por_tarjeta"`
}

type compromisoTarj struct {
	TarjetaID int64  `json:"tarjeta_id"`
	Nombre    string `json:"nombre"`
	Monto     int64  `json:"monto"`
}

// resumen es la vista de la Fase 1: disponible por rubro, avance de bolsas de
// ahorro y compromiso MSI de los próximos 6 meses.
func resumen(w http.ResponseWriter, r *http.Request) {
	periodo := cmp(r.URL.Query().Get("periodo"), time.Now().Format("2006-01"))
	if !rePeriodo.MatchString(periodo) {
		malo(w, errors.New("periodo debe ser YYYY-MM"))
		return
	}
	inicio, _ := fechaISO(periodo + "-01")
	ctx := r.Context()

	// Disponible del mes = aportaciones (yo + pareja) − gastos − cuotas MSI que
	// vencen en el mes. La compra MSI no se cuenta completa, sólo su cuota.
	rows, err := db.Query(ctx, `
		SELECT r.id, r.nombre,
		  COALESCE((SELECT SUM(a.monto) FROM aportacion a
		            WHERE a.rubro_id=r.id AND a.periodo=$1 AND a.fuente='yo'),0),
		  COALESCE((SELECT SUM(a.monto) FROM aportacion a
		            WHERE a.rubro_id=r.id AND a.periodo=$1 AND a.fuente='pareja'),0),
		  COALESCE((SELECT SUM(g.monto) FROM gasto g
		            WHERE g.rubro_id=r.id AND to_char(g.fecha,'YYYY-MM')=$1),0),
		  COALESCE((SELECT SUM(q.monto) FROM cuota_msi q JOIN compra_msi c ON c.id=q.compra_id
		            WHERE c.rubro_id=r.id AND to_char(q.fecha_vencimiento,'YYYY-MM')=$1),0)
		FROM rubro r WHERE r.tipo='gasto' ORDER BY r.id`, periodo)
	if err != nil {
		fallo(w, err)
		return
	}
	rubros := []rubroGasto{}
	for rows.Next() {
		var x rubroGasto
		if err := rows.Scan(&x.ID, &x.Nombre, &x.AportadoYo, &x.AportadoPareja, &x.Gastado, &x.CuotasMSI); err != nil {
			rows.Close()
			fallo(w, err)
			return
		}
		x.Disponible = x.AportadoYo + x.AportadoPareja - x.Gastado - x.CuotasMSI
		rubros = append(rubros, x)
	}
	rows.Close()

	// Ahorro: saldo acumulado de siempre (aportaciones − retiros), no se resetea.
	rows, err = db.Query(ctx, `
		SELECT r.id, r.nombre, r.monto_objetivo,
		  COALESCE((SELECT SUM(a.monto) FROM aportacion a WHERE a.rubro_id=r.id),0)
		- COALESCE((SELECT SUM(g.monto) FROM gasto g     WHERE g.rubro_id=r.id),0)
		FROM rubro r WHERE r.tipo='ahorro' ORDER BY r.id`)
	if err != nil {
		fallo(w, err)
		return
	}
	ahorro := []bolsaAhorro{}
	for rows.Next() {
		var b bolsaAhorro
		if err := rows.Scan(&b.ID, &b.Nombre, &b.MontoObjetivo, &b.Saldo); err != nil {
			rows.Close()
			fallo(w, err)
			return
		}
		if b.MontoObjetivo != nil && *b.MontoObjetivo > 0 {
			pct := float64(b.Saldo) / float64(*b.MontoObjetivo) * 100
			b.AvancePct = &pct
		}
		ahorro = append(ahorro, b)
	}
	rows.Close()

	// Compromiso futuro: cuotas pendientes de los próximos 6 meses.
	rows, err = db.Query(ctx, `
		SELECT to_char(q.fecha_vencimiento,'YYYY-MM'), c.tarjeta_id, m.nombre, SUM(q.monto)
		FROM cuota_msi q
		JOIN compra_msi c  ON c.id = q.compra_id
		JOIN metodo_pago m ON m.id = c.tarjeta_id
		WHERE NOT q.pagada
		  AND q.fecha_vencimiento >= $1
		  AND q.fecha_vencimiento < ($1::date + interval '6 months')
		GROUP BY 1,2,3 ORDER BY 1,2`, inicio)
	if err != nil {
		fallo(w, err)
		return
	}
	defer rows.Close()
	meses, total := []mesMSI{}, int64(0)
	for rows.Next() {
		var mes string
		var t compromisoTarj
		if err := rows.Scan(&mes, &t.TarjetaID, &t.Nombre, &t.Monto); err != nil {
			fallo(w, err)
			return
		}
		if n := len(meses); n == 0 || meses[n-1].Mes != mes {
			meses = append(meses, mesMSI{Mes: mes})
		}
		m := &meses[len(meses)-1]
		m.PorTarjeta = append(m.PorTarjeta, t)
		m.Total += t.Monto
		total += t.Monto
	}

	responder(w, map[string]any{
		"periodo": periodo,
		"rubros":  rubros,
		"ahorro":  ahorro,
		"compromiso_msi": map[string]any{
			"meses": meses,
			"total": total,
		},
	})
}
