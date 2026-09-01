package main

import (
	"errors"
	"net/http"
	"strconv"
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
