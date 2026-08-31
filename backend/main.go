package main

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"time"

	_ "embed"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed schema.sql
var schema string

var db *pgxpool.Pool

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("falta DATABASE_URL")
	}
	var err error
	db, err = pgxpool.New(context.Background(), dsn)
	if err != nil {
		log.Fatal(err)
	}
	if _, err := db.Exec(context.Background(), schema); err != nil {
		log.Fatal("schema: ", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("ok")) })
	mux.HandleFunc("GET /api/metodos-pago", listMetodos)
	mux.HandleFunc("POST /api/metodos-pago", crearMetodo)
	mux.HandleFunc("GET /api/rubros", listRubros)
	mux.HandleFunc("POST /api/rubros", crearRubro)
	mux.HandleFunc("POST /api/aportaciones", crearAportacion)
	mux.HandleFunc("GET /api/gastos", listGastos)
	mux.HandleFunc("POST /api/gastos", crearGasto)
	mux.HandleFunc("GET /api/compras-msi", listComprasMSI)
	mux.HandleFunc("POST /api/compras-msi", crearCompraMSI)
	mux.HandleFunc("PATCH /api/cuotas/{id}", marcarCuota)
	mux.HandleFunc("GET /api/resumen", resumen)

	port := cmp(os.Getenv("PORT"), "8080")
	log.Println("escuchando en :" + port)
	log.Fatal(http.ListenAndServe(":"+port, cors(auth(mux))))
}

// --- middleware -------------------------------------------------------------

// auth: token compartido de un solo usuario. Si APP_TOKEN está vacío la API
// queda abierta, sólo aceptable en local.
// ponytail: un token, sin cuentas ni sesiones. Añadir login real cuando entre
// una segunda persona a la app (el plan dice que la pareja no tiene cuenta).
func auth(next http.Handler) http.Handler {
	tok := os.Getenv("APP_TOKEN")
	if tok == "" {
		log.Println("AVISO: APP_TOKEN vacío, la API está abierta")
		return next
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}
		if subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), []byte("Bearer "+tok)) != 1 {
			http.Error(w, "no autorizado", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func cors(next http.Handler) http.Handler {
	origin := cmp(os.Getenv("CORS_ORIGIN"), "*")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// --- helpers ----------------------------------------------------------------

var rePeriodo = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])$`)

func cmp(v, def string) string {
	if v == "" {
		return def
	}
	return v
}

func leer[T any](w http.ResponseWriter, r *http.Request) (T, bool) {
	var v T
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	d.DisallowUnknownFields()
	if err := d.Decode(&v); err != nil {
		malo(w, err)
		return v, false
	}
	return v, true
}

func responder(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func malo(w http.ResponseWriter, err error) {
	http.Error(w, err.Error(), http.StatusBadRequest)
}

// fallo traduce violaciones de CHECK/FK de Postgres a 400: la validación vive
// en el esquema, no duplicada en Go.
func fallo(w http.ResponseWriter, err error) {
	var pg *pgconn.PgError
	if errors.As(err, &pg) && (pg.Code == "23514" || pg.Code == "23503" || pg.Code == "22001") {
		http.Error(w, pg.Message, http.StatusBadRequest)
		return
	}
	log.Println(err)
	http.Error(w, "error interno", http.StatusInternalServerError)
}

// fechaISO valida "YYYY-MM-DD" y lo devuelve como time.
func fechaISO(s string) (time.Time, error) {
	return time.Parse("2006-01-02", s)
}

// --- métodos de pago --------------------------------------------------------

type metodoPago struct {
	ID       int64  `json:"id"`
	Nombre   string `json:"nombre"`
	Tipo     string `json:"tipo"`
	Limite   *int64 `json:"limite,omitempty"`
	DiaCorte *int   `json:"dia_corte,omitempty"`
	DiaPago  *int   `json:"dia_pago,omitempty"`
}

func crearMetodo(w http.ResponseWriter, r *http.Request) {
	m, ok := leer[metodoPago](w, r)
	if !ok {
		return
	}
	if m.Nombre == "" {
		malo(w, errors.New("nombre requerido"))
		return
	}
	err := db.QueryRow(r.Context(),
		`INSERT INTO metodo_pago (nombre, tipo, limite, dia_corte, dia_pago)
		 VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		m.Nombre, m.Tipo, m.Limite, m.DiaCorte, m.DiaPago).Scan(&m.ID)
	if err != nil {
		fallo(w, err)
		return
	}
	responder(w, m)
}

func listMetodos(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(r.Context(),
		`SELECT id, nombre, tipo, limite, dia_corte, dia_pago FROM metodo_pago ORDER BY id`)
	if err != nil {
		fallo(w, err)
		return
	}
	defer rows.Close()
	out := []metodoPago{}
	for rows.Next() {
		var m metodoPago
		if err := rows.Scan(&m.ID, &m.Nombre, &m.Tipo, &m.Limite, &m.DiaCorte, &m.DiaPago); err != nil {
			fallo(w, err)
			return
		}
		out = append(out, m)
	}
	responder(w, out)
}

// --- rubros -----------------------------------------------------------------

type rubro struct {
	ID            int64  `json:"id"`
	Nombre        string `json:"nombre"`
	Tipo          string `json:"tipo"`
	MontoObjetivo *int64 `json:"monto_objetivo,omitempty"`
}

func crearRubro(w http.ResponseWriter, r *http.Request) {
	x, ok := leer[rubro](w, r)
	if !ok {
		return
	}
	if x.Nombre == "" {
		malo(w, errors.New("nombre requerido"))
		return
	}
	err := db.QueryRow(r.Context(),
		`INSERT INTO rubro (nombre, tipo, monto_objetivo) VALUES ($1,$2,$3) RETURNING id`,
		x.Nombre, x.Tipo, x.MontoObjetivo).Scan(&x.ID)
	if err != nil {
		fallo(w, err)
		return
	}
	responder(w, x)
}

func listRubros(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(r.Context(),
		`SELECT id, nombre, tipo, monto_objetivo FROM rubro ORDER BY id`)
	if err != nil {
		fallo(w, err)
		return
	}
	defer rows.Close()
	out := []rubro{}
	for rows.Next() {
		var x rubro
		if err := rows.Scan(&x.ID, &x.Nombre, &x.Tipo, &x.MontoObjetivo); err != nil {
			fallo(w, err)
			return
		}
		out = append(out, x)
	}
	responder(w, out)
}

// --- aportaciones -----------------------------------------------------------

type aportacion struct {
	ID      int64  `json:"id"`
	RubroID int64  `json:"rubro_id"`
	Fuente  string `json:"fuente"`
	Monto   int64  `json:"monto"`
	Periodo string `json:"periodo"`
}

func crearAportacion(w http.ResponseWriter, r *http.Request) {
	a, ok := leer[aportacion](w, r)
	if !ok {
		return
	}
	if !rePeriodo.MatchString(a.Periodo) {
		malo(w, errors.New("periodo debe ser YYYY-MM"))
		return
	}
	err := db.QueryRow(r.Context(),
		`INSERT INTO aportacion (rubro_id, fuente, monto, periodo) VALUES ($1,$2,$3,$4) RETURNING id`,
		a.RubroID, a.Fuente, a.Monto, a.Periodo).Scan(&a.ID)
	if err != nil {
		fallo(w, err)
		return
	}
	responder(w, a)
}

// --- gastos -----------------------------------------------------------------

type gasto struct {
	ID           int64  `json:"id"`
	RubroID      int64  `json:"rubro_id"`
	MetodoPagoID int64  `json:"metodo_pago_id"`
	Monto        int64  `json:"monto"`
	Fecha        string `json:"fecha"`
	Descripcion  string `json:"descripcion"`
}

func crearGasto(w http.ResponseWriter, r *http.Request) {
	g, ok := leer[gasto](w, r)
	if !ok {
		return
	}
	f, err := fechaISO(g.Fecha)
	if err != nil {
		malo(w, errors.New("fecha debe ser YYYY-MM-DD"))
		return
	}
	err = db.QueryRow(r.Context(),
		`INSERT INTO gasto (rubro_id, metodo_pago_id, monto, fecha, descripcion)
		 VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		g.RubroID, g.MetodoPagoID, g.Monto, f, g.Descripcion).Scan(&g.ID)
	if err != nil {
		fallo(w, err)
		return
	}
	responder(w, g)
}

func listGastos(w http.ResponseWriter, r *http.Request) {
	periodo := r.URL.Query().Get("periodo")
	if periodo != "" && !rePeriodo.MatchString(periodo) {
		malo(w, errors.New("periodo debe ser YYYY-MM"))
		return
	}
	rows, err := db.Query(r.Context(),
		`SELECT id, rubro_id, metodo_pago_id, monto, fecha, descripcion FROM gasto
		 WHERE $1 = '' OR to_char(fecha,'YYYY-MM') = $1
		 ORDER BY fecha DESC, id DESC`, periodo)
	if err != nil {
		fallo(w, err)
		return
	}
	defer rows.Close()
	out := []gasto{}
	for rows.Next() {
		var g gasto
		var f time.Time
		if err := rows.Scan(&g.ID, &g.RubroID, &g.MetodoPagoID, &g.Monto, &f, &g.Descripcion); err != nil {
			fallo(w, err)
			return
		}
		g.Fecha = f.Format("2006-01-02")
		out = append(out, g)
	}
	responder(w, out)
}

// --- compras MSI ------------------------------------------------------------

type compraMSI struct {
	ID          int64   `json:"id"`
	TarjetaID   int64   `json:"tarjeta_id"`
	RubroID     int64   `json:"rubro_id"`
	Descripcion string  `json:"descripcion"`
	MontoTotal  int64   `json:"monto_total"`
	PlazoMeses  int     `json:"plazo_meses"`
	FechaCompra string  `json:"fecha_compra"`
	Cuotas      []cuota `json:"cuotas,omitempty"`
}

type cuota struct {
	ID          int64  `json:"id"`
	CompraID    int64  `json:"compra_id"`
	Numero      int    `json:"numero_cuota"`
	Monto       int64  `json:"monto"`
	Vencimiento string `json:"fecha_vencimiento"`
	Pagada      bool   `json:"pagada"`
}

func crearCompraMSI(w http.ResponseWriter, r *http.Request) {
	c, ok := leer[compraMSI](w, r)
	if !ok {
		return
	}
	f, err := fechaISO(c.FechaCompra)
	if err != nil {
		malo(w, errors.New("fecha_compra debe ser YYYY-MM-DD"))
		return
	}

	var diaCorte, diaPago *int
	err = db.QueryRow(r.Context(),
		`SELECT dia_corte, dia_pago FROM metodo_pago WHERE id=$1 AND tipo='credito'`,
		c.TarjetaID).Scan(&diaCorte, &diaPago)
	if err != nil {
		malo(w, fmt.Errorf("tarjeta_id %d no es una tarjeta de crédito", c.TarjetaID))
		return
	}

	tx, err := db.Begin(r.Context())
	if err != nil {
		fallo(w, err)
		return
	}
	defer tx.Rollback(r.Context())

	err = tx.QueryRow(r.Context(),
		`INSERT INTO compra_msi (tarjeta_id, rubro_id, descripcion, monto_total, plazo_meses, fecha_compra)
		 VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		c.TarjetaID, c.RubroID, c.Descripcion, c.MontoTotal, c.PlazoMeses, f).Scan(&c.ID)
	if err != nil {
		fallo(w, err)
		return
	}
	for _, q := range generarCuotas(c.MontoTotal, c.PlazoMeses, f, *diaCorte, *diaPago) {
		var id int64
		err = tx.QueryRow(r.Context(),
			`INSERT INTO cuota_msi (compra_id, numero_cuota, monto, fecha_vencimiento)
			 VALUES ($1,$2,$3,$4) RETURNING id`,
			c.ID, q.Numero, q.Monto, q.Vencimiento).Scan(&id)
		if err != nil {
			fallo(w, err)
			return
		}
		c.Cuotas = append(c.Cuotas, cuota{ID: id, CompraID: c.ID, Numero: q.Numero,
			Monto: q.Monto, Vencimiento: q.Vencimiento.Format("2006-01-02")})
	}
	if err := tx.Commit(r.Context()); err != nil {
		fallo(w, err)
		return
	}
	responder(w, c)
}

func listComprasMSI(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(r.Context(),
		`SELECT c.id, c.tarjeta_id, c.rubro_id, c.descripcion, c.monto_total, c.plazo_meses, c.fecha_compra,
		        q.id, q.numero_cuota, q.monto, q.fecha_vencimiento, q.pagada
		 FROM compra_msi c JOIN cuota_msi q ON q.compra_id = c.id
		 ORDER BY c.id, q.numero_cuota`)
	if err != nil {
		fallo(w, err)
		return
	}
	defer rows.Close()

	out := []compraMSI{}
	for rows.Next() {
		var c compraMSI
		var q cuota
		var fc, fv time.Time
		if err := rows.Scan(&c.ID, &c.TarjetaID, &c.RubroID, &c.Descripcion, &c.MontoTotal,
			&c.PlazoMeses, &fc, &q.ID, &q.Numero, &q.Monto, &fv, &q.Pagada); err != nil {
			fallo(w, err)
			return
		}
		q.CompraID, q.Vencimiento = c.ID, fv.Format("2006-01-02")
		if n := len(out); n > 0 && out[n-1].ID == c.ID {
			out[n-1].Cuotas = append(out[n-1].Cuotas, q)
			continue
		}
		c.FechaCompra = fc.Format("2006-01-02")
		c.Cuotas = []cuota{q}
		out = append(out, c)
	}
	responder(w, out)
}

func marcarCuota(w http.ResponseWriter, r *http.Request) {
	body, ok := leer[struct {
		Pagada bool `json:"pagada"`
	}](w, r)
	if !ok {
		return
	}
	tag, err := db.Exec(r.Context(), `UPDATE cuota_msi SET pagada=$1 WHERE id=$2`, body.Pagada, r.PathValue("id"))
	if err != nil {
		fallo(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		http.Error(w, "cuota no encontrada", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
