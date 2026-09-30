package service

import "testing"

// A free number field on the client means these can be anything the user typed.
func TestNumericSettingsAreClamped(t *testing.T) {
	cases := []struct {
		name string
		got  int
		want int
	}{
		{"zero new words", clamp(0, 1, 200), 1},
		{"negative reviews", clamp(-5, 5, 1000), 5},
		{"absurd reviews", clamp(999999, 5, 1000), 1000},
		{"normal value passes", clamp(80, 5, 1000), 80},
		{"goal ceiling", clamp(9999, 1, 240), 240},
	}
	for _, c := range cases {
		if c.got != c.want {
			t.Errorf("%s: got %d, want %d", c.name, c.got, c.want)
		}
	}
}
