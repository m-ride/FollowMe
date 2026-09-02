package main

import (
	"testing"
	"time"
)

func TestMesesDesde(t *testing.T) {
	out := mesesDesde(3)
	if len(out) != 3 {
		t.Fatalf("len %d != 3", len(out))
	}
	if ahora := time.Now().Format("2006-01"); out[2] != ahora {
		t.Fatalf("último mes %s != %s (mes actual)", out[2], ahora)
	}
	for i := 1; i < len(out); i++ {
		if out[i] <= out[i-1] {
			t.Fatalf("no viene en orden ascendente sin huecos: %v", out)
		}
	}
}
