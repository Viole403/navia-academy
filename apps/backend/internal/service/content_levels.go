package service

// Content-levels whitelist — fetched from the CDN (apps/media publishes
// data/content-levels.json alongside the version manifest) with a small
// embedded last-known-good fallback for bootstrapping when the CDN is
// unreachable. The embedded copy is a deliberate exception to "no
// hardcoding": it is a bootstrap safety net only, refreshed manually from
// apps/media/data/content-levels.json when needed.

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	_ "embed" // keep go:embed import explicit and grouped by purpose
	"strings"
	"sync/atomic"
)

//go:embed levels-fallback.json
var embeddedContentLevels []byte

type contentLevels = map[string]map[string][]string

var loadedLevels atomic.Pointer[contentLevels]

func parseContentLevels(b []byte) (*contentLevels, error) {
	var m contentLevels
	if err := json.Unmarshal(b, &m); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}
	if len(m) == 0 {
		return nil, fmt.Errorf("no languages in payload")
	}
	for lang, domains := range m {
		if strings.TrimSpace(lang) == "" || len(domains) == 0 {
			return nil, fmt.Errorf("lang %q is empty or has no domains", lang)
		}
		for domain, refs := range domains {
			if strings.TrimSpace(domain) == "" || len(refs) == 0 {
				return nil, fmt.Errorf("domain %q under %q is empty or has no refs", domain, lang)
			}
			for _, ref := range refs {
				if strings.TrimSpace(ref) == "" {
					return nil, fmt.Errorf("empty ref under %s/%s", lang, domain)
				}
			}
		}
	}
	return &m, nil
}

func ensureLevelsLoaded() {
	if loadedLevels.Load() != nil {
		return
	}
	m, err := parseContentLevels(embeddedContentLevels)
	if err != nil {
		// The fallback is checked into the repo — malformed means a real bug.
		panic(fmt.Sprintf("embedded content-levels fallback is malformed: %v", err))
	}
	loadedLevels.Store(m)
}

// SetContentLevelsFromBytes validates + installs a freshly fetched whitelist.
func SetContentLevelsFromBytes(b []byte) error {
	m, err := parseContentLevels(b)
	if err != nil {
		return err
	}
	loadedLevels.Store(m)
	return nil
}

// FetchContentLevels GETs the published whitelist over HTTP and swaps it in
// atomically on success. A failure leaves the current map untouched.
func FetchContentLevels(ctx context.Context, url string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	b, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20)) // 1 MiB cap; the file is ~3 KB
	if err != nil {
		return err
	}
	return SetContentLevelsFromBytes(b)
}

// IsValidRef reports whether ref is an allowed target file for lang+domain,
// per the CDN-published whitelist (embedded fallback until first load).
func IsValidRef(lang, domain, ref string) bool {
	ensureLevelsLoaded()
	m := *loadedLevels.Load()
	for _, r := range m[lang][domain] {
		if r == ref {
			return true
		}
	}
	return false
}
