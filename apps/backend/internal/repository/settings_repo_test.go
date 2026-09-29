package repository

import (
	"os"
	"regexp"
	"strings"
	"testing"
)

// The settings upsert states its columns, its placeholders and its arguments in
// three separate places, and neither the compiler nor go vet checks that they
// still agree. Dropping a column leaves valid Go that only fails on the first
// write, so the counts are asserted here.
func TestSettingsSQLArity(t *testing.T) {
	b, err := os.ReadFile("settings_repo.go")
	if err != nil {
		t.Fatal(err)
	}
	s := string(b)

	selectCols := list(capture(t, s, `(?s)SELECT (.*?)\s*FROM user_settings`))
	scanArgs := findAll(t, s, `(?s)row\.Scan\((.*?)\)`, `&s\.\w+`)
	if len(selectCols) != len(scanArgs) {
		t.Fatalf("SELECT lists %d columns but Scan takes %d args: %v", len(selectCols), len(scanArgs), selectCols)
	}

	insertCols := list(capture(t, s, `(?s)INSERT INTO user_settings \((.*?)\)\s*VALUES`))
	placeholders := findAll(t, s, `(?s)VALUES \((.*?)\)`, `\$\d+`)
	execArgs := findAll(t, s, `(?s)Exec\(ctx,.*?\x60,\s*(.*?)\)\s*\n\treturn err`, `s\.\w+`)
	if len(insertCols) != len(placeholders) || len(insertCols) != len(execArgs) {
		t.Fatalf("INSERT has %d columns, %d placeholders, %d exec args",
			len(insertCols), len(placeholders), len(execArgs))
	}
}

func capture(t *testing.T, s, pat string) string {
	t.Helper()
	m := regexp.MustCompile(pat).FindStringSubmatch(s)
	if m == nil {
		t.Fatalf("pattern %q matched nothing", pat)
	}
	return m[1]
}

func findAll(t *testing.T, s, pat, inner string) []string {
	t.Helper()
	return regexp.MustCompile(inner).FindAllString(capture(t, s, pat), -1)
}

func list(s string) []string {
	var out []string
	for _, c := range strings.Split(s, ",") {
		if strings.TrimSpace(c) != "" {
			out = append(out, strings.TrimSpace(c))
		}
	}
	return out
}
