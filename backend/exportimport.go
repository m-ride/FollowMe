package main

import (
	"encoding/json"
	"net/http"
	"time"
)

type respaldo struct {
	Version             int                `json:"version"`
	GeneradoEn          string             `json:"generado_en"`
	MetodoPago          []metodoPago       `json:"metodo_pago"`
	Rubro               []rubro            `json:"rubro"`
	Aportacion          []aportacion       `json:"aportacion"`
	Gasto               []gasto            `json:"gasto"`
	CompraMSI           []compraMSI        `json:"compra_msi"`
	Ingreso             []ingreso          `json:"ingreso"`
	PatrimonioHistorico []puntoHistPatrimo `json:"patrimonio_historico"`
}

// puntoHistPatrimo lleva registrado_en (a diferencia de puntoPatrimonio, que es solo
// para el endpoint de lectura) porque el respaldo debe poder restaurarlo tal cual.
type puntoHistPatrimo struct {
	Periodo      string    `json:"periodo"`
	Monto        int64     `json:"monto"`
	RegistradoEn time.Time `json:"registrado_en"`
}

// exportar arma un solo JSON con las 7 tablas, reutilizando las mismas queries que ya
// usan los handlers de lista existentes — nada nuevo, solo se junta en una respuesta.
func exportar(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	out := respaldo{Version: 1, GeneradoEn: time.Now().UTC().Format(time.RFC3339)}

	rows, err := db.Query(ctx, `SELECT id, nombre, tipo, limite, dia_corte, dia_pago FROM metodo_pago ORDER BY id`)
	if err != nil {
		fallo(w, err)
		return
	}
	for rows.Next() {
		var m metodoPago
		if err := rows.Scan(&m.ID, &m.Nombre, &m.Tipo, &m.Limite, &m.DiaCorte, &m.DiaPago); err != nil {
			rows.Close()
			fallo(w, err)
			return
		}
		out.MetodoPago = append(out.MetodoPago, m)
	}
	rows.Close()

	rows, err = db.Query(ctx, `SELECT id, nombre, tipo, monto_objetivo, clasificacion, es_fondo_emergencia FROM rubro ORDER BY id`)
	if err != nil {
		fallo(w, err)
		return
	}
	for rows.Next() {
		var x rubro
		if err := rows.Scan(&x.ID, &x.Nombre, &x.Tipo, &x.MontoObjetivo, &x.Clasificacion, &x.EsFondoEmergencia); err != nil {
			rows.Close()
			fallo(w, err)
			return
		}
		out.Rubro = append(out.Rubro, x)
	}
	rows.Close()

	rows, err = db.Query(ctx, `SELECT id, rubro_id, fuente, monto, periodo FROM aportacion ORDER BY id`)
	if err != nil {
		fallo(w, err)
		return
	}
	for rows.Next() {
		var a aportacion
		if err := rows.Scan(&a.ID, &a.RubroID, &a.Fuente, &a.Monto, &a.Periodo); err != nil {
			rows.Close()
			fallo(w, err)
			return
		}
		out.Aportacion = append(out.Aportacion, a)
	}
	rows.Close()

	rows, err = db.Query(ctx, `SELECT id, rubro_id, metodo_pago_id, monto, fecha, descripcion FROM gasto ORDER BY id`)
	if err != nil {
		fallo(w, err)
		return
	}
	for rows.Next() {
		var g gasto
		var f time.Time
		if err := rows.Scan(&g.ID, &g.RubroID, &g.MetodoPagoID, &g.Monto, &f, &g.Descripcion); err != nil {
			rows.Close()
			fallo(w, err)
			return
		}
		g.Fecha = f.Format("2006-01-02")
		out.Gasto = append(out.Gasto, g)
	}
	rows.Close()

	rows, err = db.Query(ctx, `
		SELECT c.id, c.tarjeta_id, c.rubro_id, c.descripcion, c.monto_total, c.plazo_meses, c.fecha_compra,
		       q.id, q.numero_cuota, q.monto, q.fecha_vencimiento, q.pagada
		FROM compra_msi c JOIN cuota_msi q ON q.compra_id = c.id
		ORDER BY c.id, q.numero_cuota`)
	if err != nil {
		fallo(w, err)
		return
	}
	for rows.Next() {
		var c compraMSI
		var q cuota
		var fc, fv time.Time
		if err := rows.Scan(&c.ID, &c.TarjetaID, &c.RubroID, &c.Descripcion, &c.MontoTotal,
			&c.PlazoMeses, &fc, &q.ID, &q.Numero, &q.Monto, &fv, &q.Pagada); err != nil {
			rows.Close()
			fallo(w, err)
			return
		}
		q.CompraID, q.Vencimiento = c.ID, fv.Format("2006-01-02")
		if n := len(out.CompraMSI); n > 0 && out.CompraMSI[n-1].ID == c.ID {
			out.CompraMSI[n-1].Cuotas = append(out.CompraMSI[n-1].Cuotas, q)
			continue
		}
		c.FechaCompra = fc.Format("2006-01-02")
		c.Cuotas = []cuota{q}
		out.CompraMSI = append(out.CompraMSI, c)
	}
	rows.Close()

	rows, err = db.Query(ctx, `SELECT id, fuente, monto, periodo FROM ingreso ORDER BY id`)
	if err != nil {
		fallo(w, err)
		return
	}
	for rows.Next() {
		var x ingreso
		if err := rows.Scan(&x.ID, &x.Fuente, &x.Monto, &x.Periodo); err != nil {
			rows.Close()
			fallo(w, err)
			return
		}
		out.Ingreso = append(out.Ingreso, x)
	}
	rows.Close()

	rows, err = db.Query(ctx, `SELECT periodo, monto, registrado_en FROM patrimonio_historico ORDER BY periodo`)
	if err != nil {
		fallo(w, err)
		return
	}
	for rows.Next() {
		var p puntoHistPatrimo
		if err := rows.Scan(&p.Periodo, &p.Monto, &p.RegistradoEn); err != nil {
			rows.Close()
			fallo(w, err)
			return
		}
		out.PatrimonioHistorico = append(out.PatrimonioHistorico, p)
	}
	rows.Close()

	w.Header().Set("Content-Disposition", `attachment; filename="followme-respaldo.json"`)
	responder(w, out)
}

// importar reemplaza TODOS los datos dentro de una transacción: trunca, inserta cada
// tabla preservando los IDs originales (las referencias como cuota_msi.compra_id
// dependen de eso) y reajusta las secuencias. Cualquier error hace rollback completo —
// es todo o nada, no una fusión con lo que ya había.
func importar(w http.ResponseWriter, r *http.Request) {
	var b respaldo
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<20))
	if err := d.Decode(&b); err != nil {
		malo(w, err)
		return
	}

	ctx := r.Context()
	tx, err := db.Begin(ctx)
	if err != nil {
		fallo(w, err)
		return
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `TRUNCATE cuota_msi, compra_msi, gasto, aportacion, ingreso,
		patrimonio_historico, rubro, metodo_pago RESTART IDENTITY CASCADE`); err != nil {
		fallo(w, err)
		return
	}

	for _, m := range b.MetodoPago {
		if _, err := tx.Exec(ctx,
			`INSERT INTO metodo_pago (id, nombre, tipo, limite, dia_corte, dia_pago) VALUES ($1,$2,$3,$4,$5,$6)`,
			m.ID, m.Nombre, m.Tipo, m.Limite, m.DiaCorte, m.DiaPago); err != nil {
			fallo(w, err)
			return
		}
	}
	for _, x := range b.Rubro {
		if _, err := tx.Exec(ctx,
			`INSERT INTO rubro (id, nombre, tipo, monto_objetivo, clasificacion, es_fondo_emergencia) VALUES ($1,$2,$3,$4,$5,$6)`,
			x.ID, x.Nombre, x.Tipo, x.MontoObjetivo, x.Clasificacion, x.EsFondoEmergencia); err != nil {
			fallo(w, err)
			return
		}
	}
	for _, a := range b.Aportacion {
		if _, err := tx.Exec(ctx,
			`INSERT INTO aportacion (id, rubro_id, fuente, monto, periodo) VALUES ($1,$2,$3,$4,$5)`,
			a.ID, a.RubroID, a.Fuente, a.Monto, a.Periodo); err != nil {
			fallo(w, err)
			return
		}
	}
	for _, g := range b.Gasto {
		f, err := fechaISO(g.Fecha)
		if err != nil {
			malo(w, err)
			return
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO gasto (id, rubro_id, metodo_pago_id, monto, fecha, descripcion) VALUES ($1,$2,$3,$4,$5,$6)`,
			g.ID, g.RubroID, g.MetodoPagoID, g.Monto, f, g.Descripcion); err != nil {
			fallo(w, err)
			return
		}
	}
	for _, c := range b.CompraMSI {
		fc, err := fechaISO(c.FechaCompra)
		if err != nil {
			malo(w, err)
			return
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO compra_msi (id, tarjeta_id, rubro_id, descripcion, monto_total, plazo_meses, fecha_compra) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			c.ID, c.TarjetaID, c.RubroID, c.Descripcion, c.MontoTotal, c.PlazoMeses, fc); err != nil {
			fallo(w, err)
			return
		}
		for _, q := range c.Cuotas {
			fv, err := fechaISO(q.Vencimiento)
			if err != nil {
				malo(w, err)
				return
			}
			if _, err := tx.Exec(ctx,
				`INSERT INTO cuota_msi (id, compra_id, numero_cuota, monto, fecha_vencimiento, pagada) VALUES ($1,$2,$3,$4,$5,$6)`,
				q.ID, c.ID, q.Numero, q.Monto, fv, q.Pagada); err != nil {
				fallo(w, err)
				return
			}
		}
	}
	for _, x := range b.Ingreso {
		if _, err := tx.Exec(ctx,
			`INSERT INTO ingreso (id, fuente, monto, periodo) VALUES ($1,$2,$3,$4)`,
			x.ID, x.Fuente, x.Monto, x.Periodo); err != nil {
			fallo(w, err)
			return
		}
	}
	for _, p := range b.PatrimonioHistorico {
		if _, err := tx.Exec(ctx,
			`INSERT INTO patrimonio_historico (periodo, monto, registrado_en) VALUES ($1,$2,$3)`,
			p.Periodo, p.Monto, p.RegistradoEn); err != nil {
			fallo(w, err)
			return
		}
	}

	for _, tabla := range []string{"metodo_pago", "rubro", "aportacion", "gasto", "compra_msi", "cuota_msi", "ingreso"} {
		// is_called = false cuando la tabla queda vacía, para que el próximo nextval
		// siga siendo 1 en vez de saltárselo.
		if _, err := tx.Exec(ctx,
			`SELECT setval(pg_get_serial_sequence('`+tabla+`','id'),
			              COALESCE((SELECT MAX(id) FROM `+tabla+`), 1),
			              (SELECT MAX(id) FROM `+tabla+`) IS NOT NULL)`); err != nil {
			fallo(w, err)
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		fallo(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
