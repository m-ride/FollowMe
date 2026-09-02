package main

import (
	"errors"
	"net/http"
	"strconv"
	"time"
)

type mesTendencia struct {
	Periodo            string   `json:"periodo"`
	Ingreso            int64    `json:"ingreso"`
	GastoFijo          int64    `json:"gasto_fijo"`
	GastoDiscrecional  int64    `json:"gasto_discrecional"`
	GastoSinClasificar int64    `json:"gasto_sin_clasificar"`
	GastoTotal         int64    `json:"gasto_total"`
	TasaAhorro         *float64 `json:"tasa_ahorro,omitempty"`
}

// mesesParam lee ?meses=N con un default y un tope, para no dejar la query sin límite.
func mesesParam(r *http.Request, def, tope int) (int, error) {
	v := r.URL.Query().Get("meses")
	if v == "" {
		return def, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil || n < 1 || n > tope {
		return 0, errors.New("meses debe ser un entero entre 1 y " + strconv.Itoa(tope))
	}
	return n, nil
}

// tendencia agrega ingreso/gasto por mes calendario para los últimos N meses. Usa
// generate_series para que un mes sin actividad salga en 0 en vez de faltar — si no,
// el gráfico de tendencia queda con huecos.
func tendencia(w http.ResponseWriter, r *http.Request) {
	n, err := mesesParam(r, 12, 24)
	if err != nil {
		malo(w, err)
		return
	}
	ctx := r.Context()
	rows, err := db.Query(ctx, `
		WITH meses AS (
		  SELECT to_char(d,'YYYY-MM') periodo
		  FROM generate_series(date_trunc('month', now()) - ($1::int - 1) * interval '1 month',
		                        date_trunc('month', now()), interval '1 month') d
		),
		ing AS (SELECT periodo, SUM(monto) t FROM ingreso GROUP BY periodo),
		gas AS (
		  SELECT to_char(g.fecha,'YYYY-MM') periodo, r.clasificacion, SUM(g.monto) t
		  FROM gasto g JOIN rubro r ON r.id = g.rubro_id GROUP BY 1,2
		)
		SELECT m.periodo, COALESCE(i.t,0),
		  COALESCE(SUM(g.t) FILTER (WHERE g.clasificacion='fijo'),0),
		  COALESCE(SUM(g.t) FILTER (WHERE g.clasificacion='discrecional'),0),
		  COALESCE(SUM(g.t) FILTER (WHERE g.clasificacion IS NULL),0)
		FROM meses m
		LEFT JOIN ing i ON i.periodo = m.periodo
		LEFT JOIN gas g ON g.periodo = m.periodo
		GROUP BY m.periodo, i.t
		ORDER BY m.periodo`, n)
	if err != nil {
		fallo(w, err)
		return
	}
	defer rows.Close()
	meses := []mesTendencia{}
	for rows.Next() {
		var x mesTendencia
		if err := rows.Scan(&x.Periodo, &x.Ingreso, &x.GastoFijo, &x.GastoDiscrecional, &x.GastoSinClasificar); err != nil {
			fallo(w, err)
			return
		}
		x.GastoTotal = x.GastoFijo + x.GastoDiscrecional + x.GastoSinClasificar
		if x.Ingreso > 0 {
			ta := float64(x.Ingreso-x.GastoTotal) / float64(x.Ingreso) * 100
			x.TasaAhorro = &ta
		}
		meses = append(meses, x)
	}
	responder(w, map[string]any{"meses": meses})
}

// mesesDesde arma la misma lista de periodos "YYYY-MM" que la CTE `meses` de las
// queries de tendencia (N-1 meses atrás hasta el mes calendario actual), calculada en
// Go en vez de leída del resultado — así no depende de que la fila de algún rubro/
// tarjeta exista en todos los meses.
func mesesDesde(n int) []string {
	inicio := time.Now()
	inicio = time.Date(inicio.Year(), inicio.Month(), 1, 0, 0, 0, 0, inicio.Location())
	out := make([]string, n)
	for i := 0; i < n; i++ {
		out[i] = inicio.AddDate(0, -(n - 1 - i), 0).Format("2006-01")
	}
	return out
}

type rubroTendencia struct {
	RubroID int64   `json:"rubro_id"`
	Nombre  string  `json:"nombre"`
	Montos  []int64 `json:"montos"`
}

// tendenciaRubros: gasto mensual por rubro (solo tipo=gasto) de los últimos N meses —
// a diferencia de tendencia() arriba, que solo parte el gasto en fijo/discrecional/sin
// clasificar, esto deja ver si una categoría puntual (Comida fuera, etc.) viene
// subiendo o bajando mes con mes.
func tendenciaRubros(w http.ResponseWriter, r *http.Request) {
	n, err := mesesParam(r, 6, 24)
	if err != nil {
		malo(w, err)
		return
	}
	rows, err := db.Query(r.Context(), `
		WITH meses AS (
		  SELECT to_char(d,'YYYY-MM') periodo
		  FROM generate_series(date_trunc('month', now()) - ($1::int - 1) * interval '1 month',
		                        date_trunc('month', now()), interval '1 month') d
		)
		SELECT r.id, r.nombre, m.periodo, COALESCE(SUM(g.monto),0)
		FROM rubro r
		CROSS JOIN meses m
		LEFT JOIN gasto g ON g.rubro_id = r.id AND to_char(g.fecha,'YYYY-MM') = m.periodo
		WHERE r.tipo = 'gasto'
		GROUP BY r.id, r.nombre, m.periodo
		ORDER BY r.id, m.periodo`, n)
	if err != nil {
		fallo(w, err)
		return
	}
	defer rows.Close()

	rubros := []rubroTendencia{}
	var actual *rubroTendencia
	for rows.Next() {
		var id int64
		var nombre, periodo string
		var monto int64
		if err := rows.Scan(&id, &nombre, &periodo, &monto); err != nil {
			fallo(w, err)
			return
		}
		if actual == nil || actual.RubroID != id {
			rubros = append(rubros, rubroTendencia{RubroID: id, Nombre: nombre})
			actual = &rubros[len(rubros)-1]
		}
		actual.Montos = append(actual.Montos, monto)
	}
	responder(w, map[string]any{"meses": mesesDesde(n), "rubros": rubros})
}

type tarjetaTendencia struct {
	ID             int64     `json:"id"`
	Nombre         string    `json:"nombre"`
	Limite         int64     `json:"limite"`
	PctUtilizacion []float64 `json:"pct_utilizacion"`
}

// tendenciaTarjetas: % de utilización mensual por tarjeta de crédito de los últimos N
// meses — misma fórmula simplificada que resumen() usa para el mes actual (gasto +
// cuotas MSI no pagadas que vencen ese mes, por mes calendario), repetida mes a mes.
func tendenciaTarjetas(w http.ResponseWriter, r *http.Request) {
	n, err := mesesParam(r, 6, 24)
	if err != nil {
		malo(w, err)
		return
	}
	rows, err := db.Query(r.Context(), `
		WITH meses AS (
		  SELECT to_char(d,'YYYY-MM') periodo
		  FROM generate_series(date_trunc('month', now()) - ($1::int - 1) * interval '1 month',
		                        date_trunc('month', now()), interval '1 month') d
		)
		SELECT m2.id, m2.nombre, m2.limite, me.periodo,
		  COALESCE((SELECT SUM(g.monto) FROM gasto g
		            WHERE g.metodo_pago_id=m2.id AND to_char(g.fecha,'YYYY-MM')=me.periodo),0)
		  + COALESCE((SELECT SUM(q.monto) FROM cuota_msi q JOIN compra_msi c ON c.id=q.compra_id
		              WHERE c.tarjeta_id=m2.id AND to_char(q.fecha_vencimiento,'YYYY-MM')=me.periodo
		                AND NOT q.pagada),0)
		FROM metodo_pago m2
		CROSS JOIN meses me
		WHERE m2.tipo='credito'
		ORDER BY m2.id, me.periodo`, n)
	if err != nil {
		fallo(w, err)
		return
	}
	defer rows.Close()

	tarjetas := []tarjetaTendencia{}
	var actual *tarjetaTendencia
	for rows.Next() {
		var id, limite, saldo int64
		var nombre, periodo string
		if err := rows.Scan(&id, &nombre, &limite, &periodo, &saldo); err != nil {
			fallo(w, err)
			return
		}
		if actual == nil || actual.ID != id {
			tarjetas = append(tarjetas, tarjetaTendencia{ID: id, Nombre: nombre, Limite: limite})
			actual = &tarjetas[len(tarjetas)-1]
		}
		var pct float64
		if limite > 0 {
			pct = float64(saldo) / float64(limite) * 100
		}
		actual.PctUtilizacion = append(actual.PctUtilizacion, pct)
	}
	responder(w, map[string]any{"meses": mesesDesde(n), "tarjetas": tarjetas})
}

type puntoPatrimonio struct {
	Periodo string `json:"periodo"`
	Monto   int64  `json:"monto"`
}

// patrimonioHistorico lee el snapshot guardado por resumen() (ver ahí). Solo existe
// hacia adelante desde que esto se desplegó — no hay reconstrucción retroactiva.
func patrimonioHistorico(w http.ResponseWriter, r *http.Request) {
	n, err := mesesParam(r, 12, 24)
	if err != nil {
		malo(w, err)
		return
	}
	rows, err := db.Query(r.Context(),
		`SELECT periodo, monto FROM patrimonio_historico ORDER BY periodo DESC LIMIT $1`, n)
	if err != nil {
		fallo(w, err)
		return
	}
	defer rows.Close()
	puntos := []puntoPatrimonio{}
	for rows.Next() {
		var p puntoPatrimonio
		if err := rows.Scan(&p.Periodo, &p.Monto); err != nil {
			fallo(w, err)
			return
		}
		puntos = append(puntos, p)
	}
	for i, j := 0, len(puntos)-1; i < j; i, j = i+1, j-1 {
		puntos[i], puntos[j] = puntos[j], puntos[i]
	}
	responder(w, map[string]any{"meses": puntos})
}
