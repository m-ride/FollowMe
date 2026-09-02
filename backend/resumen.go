package main

import (
	"errors"
	"net/http"
	"time"
)

type rubroGasto struct {
	ID             int64   `json:"id"`
	Nombre         string  `json:"nombre"`
	Clasificacion  *string `json:"clasificacion,omitempty"`
	AportadoYo     int64   `json:"aportado_yo"`
	AportadoPareja int64   `json:"aportado_pareja"`
	Gastado        int64   `json:"gastado"`
	CuotasMSI      int64   `json:"cuotas_msi"`
	Disponible     int64   `json:"disponible"`
}

type tarjetaSalud struct {
	ID             int64   `json:"id"`
	Nombre         string  `json:"nombre"`
	Limite         int64   `json:"limite"`
	SaldoActual    int64   `json:"saldo_actual"`
	PctUtilizacion float64 `json:"pct_utilizacion"`
}

type salud struct {
	TasaAhorro                *float64 `json:"tasa_ahorro,omitempty"`
	PctIngresoComprometidoMSI *float64 `json:"pct_ingreso_comprometido_msi,omitempty"`
	PatrimonioNeto            int64    `json:"patrimonio_neto"`
	GastoFijo                 int64    `json:"gasto_fijo"`
	GastoDiscrecional         int64    `json:"gasto_discrecional"`
	GastoSinClasificar        int64    `json:"gasto_sin_clasificar"`
}

type bolsaAhorro struct {
	ID                int64    `json:"id"`
	Nombre            string   `json:"nombre"`
	Saldo             int64    `json:"saldo"`
	MontoObjetivo     *int64   `json:"monto_objetivo,omitempty"`
	AvancePct         *float64 `json:"avance_pct,omitempty"`
	EsFondoEmergencia bool     `json:"es_fondo_emergencia,omitempty"`
}

// fondoEmergencia (Fase 3): objetivo 3-6 meses de gasto fijo promedio, sobre el
// rubro de ahorro marcado con es_fondo_emergencia (a lo más uno, por índice único).
type fondoEmergencia struct {
	RubroID                  int64    `json:"rubro_id"`
	Saldo                    int64    `json:"saldo"`
	GastoFijoPromedioMensual int64    `json:"gasto_fijo_promedio_mensual"`
	ObjetivoMin              int64    `json:"objetivo_min"`
	ObjetivoMax              int64    `json:"objetivo_max"`
	AvancePctMin             *float64 `json:"avance_pct_min,omitempty"`
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
		SELECT r.id, r.nombre, r.clasificacion,
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
		if err := rows.Scan(&x.ID, &x.Nombre, &x.Clasificacion, &x.AportadoYo, &x.AportadoPareja, &x.Gastado, &x.CuotasMSI); err != nil {
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
		SELECT r.id, r.nombre, r.monto_objetivo, r.es_fondo_emergencia,
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
		if err := rows.Scan(&b.ID, &b.Nombre, &b.MontoObjetivo, &b.EsFondoEmergencia, &b.Saldo); err != nil {
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

	// --- Fase 2: salud financiera ---

	var ingresoTotal int64
	if err := db.QueryRow(ctx, `SELECT COALESCE(SUM(monto),0) FROM ingreso WHERE periodo=$1`, periodo).
		Scan(&ingresoTotal); err != nil {
		fallo(w, err)
		return
	}

	// Gasto del mes partido por clasificación del rubro (fijo/discrecional/sin
	// clasificar) — sin clasificar es su propio balde, no se mezcla ni se oculta.
	// LEFT JOIN (no INNER): un gasto que se quedó sin rubro (rubro_id NULL, porque el
	// rubro se borró) debe seguir contando en el total, no desaparecer de la salud
	// financiera — cae en "sin clasificar" igual que un rubro sin clasificacion.
	var gastoFijo, gastoDiscrecional, gastoSinClasificar int64
	rowsClasif, err := db.Query(ctx, `
		SELECT r.clasificacion, SUM(g.monto)
		FROM gasto g LEFT JOIN rubro r ON r.id = g.rubro_id
		WHERE to_char(g.fecha,'YYYY-MM') = $1
		GROUP BY r.clasificacion`, periodo)
	if err != nil {
		fallo(w, err)
		return
	}
	for rowsClasif.Next() {
		var clasif *string
		var monto int64
		if err := rowsClasif.Scan(&clasif, &monto); err != nil {
			rowsClasif.Close()
			fallo(w, err)
			return
		}
		switch {
		case clasif == nil:
			gastoSinClasificar = monto
		case *clasif == "fijo":
			gastoFijo = monto
		case *clasif == "discrecional":
			gastoDiscrecional = monto
		}
	}
	rowsClasif.Close()

	// Pasivo para patrimonio neto: TODA cuota pendiente, no solo los próximos 6
	// meses (compromiso_msi.total de arriba es la vista a 6 meses, para otra cosa).
	var pasivoTotal int64
	if err := db.QueryRow(ctx, `SELECT COALESCE(SUM(monto),0) FROM cuota_msi WHERE NOT pagada`).
		Scan(&pasivoTotal); err != nil {
		fallo(w, err)
		return
	}

	// Utilización de crédito: gasto normal del mes + cuotas MSI que vencen el mes,
	// por tarjeta. Igual de simplificado que "Disponible" arriba — por mes
	// calendario, no por ciclo de corte exacto de cada tarjeta.
	rowsTarj, err := db.Query(ctx, `
		SELECT m.id, m.nombre, m.limite,
		  COALESCE((SELECT SUM(g.monto) FROM gasto g
		            WHERE g.metodo_pago_id=m.id AND to_char(g.fecha,'YYYY-MM')=$1),0)
		  + COALESCE((SELECT SUM(q.monto) FROM cuota_msi q JOIN compra_msi c ON c.id=q.compra_id
		              WHERE c.tarjeta_id=m.id AND to_char(q.fecha_vencimiento,'YYYY-MM')=$1
		                AND NOT q.pagada),0)
		FROM metodo_pago m WHERE m.tipo='credito' ORDER BY m.id`, periodo)
	if err != nil {
		fallo(w, err)
		return
	}
	tarjetas := []tarjetaSalud{}
	for rowsTarj.Next() {
		var t tarjetaSalud
		if err := rowsTarj.Scan(&t.ID, &t.Nombre, &t.Limite, &t.SaldoActual); err != nil {
			rowsTarj.Close()
			fallo(w, err)
			return
		}
		if t.Limite > 0 {
			t.PctUtilizacion = float64(t.SaldoActual) / float64(t.Limite) * 100
		}
		tarjetas = append(tarjetas, t)
	}
	rowsTarj.Close()

	totalAhorro := int64(0)
	for _, b := range ahorro {
		totalAhorro += b.Saldo
	}
	gastoTotalMes := gastoFijo + gastoDiscrecional + gastoSinClasificar
	patrimonioNeto := totalAhorro - pasivoTotal

	sd := salud{
		PatrimonioNeto:     patrimonioNeto,
		GastoFijo:          gastoFijo,
		GastoDiscrecional:  gastoDiscrecional,
		GastoSinClasificar: gastoSinClasificar,
	}
	if ingresoTotal > 0 {
		ta := float64(ingresoTotal-gastoTotalMes) / float64(ingresoTotal) * 100
		sd.TasaAhorro = &ta
		var compromisoMes int64
		for _, m := range meses {
			if m.Mes == periodo {
				compromisoMes = m.Total
				break
			}
		}
		pc := float64(compromisoMes) / float64(ingresoTotal) * 100
		sd.PctIngresoComprometidoMSI = &pc
	}

	// Fondo de emergencia (Fase 3): objetivo 3-6 meses de gasto fijo promedio de los
	// últimos 3 meses calendario completos (no incluye el mes en curso, aún incompleto).
	var fondo *fondoEmergencia
	for _, b := range ahorro {
		if !b.EsFondoEmergencia {
			continue
		}
		var promedio int64
		if err := db.QueryRow(ctx, `
			SELECT COALESCE(AVG(t),0)::bigint FROM (
			  SELECT SUM(g.monto) t FROM gasto g JOIN rubro r ON r.id=g.rubro_id
			  WHERE r.clasificacion='fijo'
			    AND g.fecha >= date_trunc('month', now()) - interval '3 months'
			    AND g.fecha <  date_trunc('month', now())
			  GROUP BY to_char(g.fecha,'YYYY-MM')
			) x`).Scan(&promedio); err != nil {
			fallo(w, err)
			return
		}
		f := &fondoEmergencia{
			RubroID: b.ID, Saldo: b.Saldo, GastoFijoPromedioMensual: promedio,
			ObjetivoMin: promedio * 3, ObjetivoMax: promedio * 6,
		}
		if f.ObjetivoMin > 0 {
			pct := float64(f.Saldo) / float64(f.ObjetivoMin) * 100
			f.AvancePctMin = &pct
		}
		fondo = f
		break
	}

	// Snapshot de patrimonio neto hacia adelante: solo se graba cuando se consulta el
	// mes calendario actual del servidor, para no corromper el histórico consultando
	// periodos pasados/futuros. El valor del mes en curso se sigue refinando en cada
	// llamada y se congela solo al cruzar de mes.
	if periodo == time.Now().Format("2006-01") {
		if _, err := db.Exec(ctx, `
			INSERT INTO patrimonio_historico (periodo, monto) VALUES ($1, $2)
			ON CONFLICT (periodo) DO UPDATE SET monto=EXCLUDED.monto, registrado_en=now()`,
			periodo, patrimonioNeto); err != nil {
			fallo(w, err)
			return
		}
	}

	// Pendientes: registros que se quedaron sin método de pago o sin rubro porque el
	// método/rubro original se borró (ON DELETE SET NULL) — requieren que el usuario
	// les asigne uno nuevo. Ver pantalla "Pendientes".
	var gastosSinMetodo, comprasSinTarjeta, gastosSinRubro, comprasSinRubro int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM gasto WHERE metodo_pago_id IS NULL`).Scan(&gastosSinMetodo); err != nil {
		fallo(w, err)
		return
	}
	if err := db.QueryRow(ctx, `SELECT count(*) FROM compra_msi WHERE tarjeta_id IS NULL`).Scan(&comprasSinTarjeta); err != nil {
		fallo(w, err)
		return
	}
	if err := db.QueryRow(ctx, `SELECT count(*) FROM gasto WHERE rubro_id IS NULL`).Scan(&gastosSinRubro); err != nil {
		fallo(w, err)
		return
	}
	if err := db.QueryRow(ctx, `SELECT count(*) FROM compra_msi WHERE rubro_id IS NULL`).Scan(&comprasSinRubro); err != nil {
		fallo(w, err)
		return
	}

	responder(w, map[string]any{
		"periodo":          periodo,
		"rubros":           rubros,
		"ahorro":           ahorro,
		"ingreso_total":    ingresoTotal,
		"tarjetas":         tarjetas,
		"salud":            sd,
		"fondo_emergencia": fondo,
		"compromiso_msi": map[string]any{
			"meses": meses,
			"total": total,
		},
		"pendientes": map[string]any{
			"gastos_sin_metodo":   gastosSinMetodo,
			"compras_sin_tarjeta": comprasSinTarjeta,
			"gastos_sin_rubro":    gastosSinRubro,
			"compras_sin_rubro":   comprasSinRubro,
		},
	})
}
