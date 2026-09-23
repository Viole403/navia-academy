package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"
)

func examLangOf(examType string) string {
	switch strings.ToLower(examType) {
	case "goethe":
		return "de"
	case "jlpt":
		return "ja"
	case "toefl":
		return "en"
	default:
		return "zh" // hsk, tocfl
	}
}

type vocabItem struct {
	ID            string                 `json:"id"`
	Hanzi         string                 `json:"hanzi"`
	Text          string                 `json:"text"`
	Pinyin        string                 `json:"pinyin"`
	Pronunciation []string               `json:"pronunciation"`
	Translation   string                 `json:"translation"`
	ExamMappings  map[string]interface{} `json:"examMappings"`
}

func (v vocabItem) headword() string {
	if v.Hanzi != "" {
		return v.Hanzi
	}
	return v.Text
}

func (v vocabItem) reading() string {
	if v.Pinyin != "" {
		return v.Pinyin
	}
	if len(v.Pronunciation) > 0 {
		return v.Pronunciation[0]
	}
	return ""
}

func (v vocabItem) levelFor(examType string) string {
	if v.ExamMappings == nil {
		return ""
	}
	for k, val := range v.ExamMappings {
		if strings.EqualFold(k, examType) {
			return fmt.Sprintf("%v", val)
		}
	}
	return ""
}

var vocabHTTP = &http.Client{Timeout: 5 * time.Second}

func fetchJSON(ctx context.Context, url string, target interface{}) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	res, err := vocabHTTP.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("cdn %s -> %d", url, res.StatusCode)
	}
	return json.NewDecoder(res.Body).Decode(target)
}

func (s *ExamService) loadVocabPool(ctx context.Context, examType string) ([]vocabItem, error) {
	base := strings.TrimRight(s.contentBaseURL, "/")
	if base == "" {
		return nil, errors.New("content base url not configured")
	}
	lang := examLangOf(examType)

	var manifest map[string]string
	if err := fetchJSON(ctx, base+"/data/data-manifest.json", &manifest); err != nil {
		return nil, err
	}
	file, ok := manifest[lang+"/vocabulary/index"]
	if !ok || file == "" {
		return nil, fmt.Errorf("no bundle for %s/vocabulary/index", lang)
	}
	var items []vocabItem
	if err := fetchJSON(ctx, base+"/data/"+strings.TrimPrefix(file, "/"), &items); err != nil {
		return nil, err
	}
	// Keep only usable items: must have a headword and a translation.
	out := items[:0]
	for _, it := range items {
		if it.headword() != "" && it.Translation != "" {
			out = append(out, it)
		}
	}
	if len(out) == 0 {
		return nil, errors.New("vocab pool empty after filtering")
	}
	return out, nil
}

func (s *ExamService) vocabQuestions(ctx context.Context, examType, examLevel string, count int, questionTypes, difficultyRange []string) []map[string]interface{} {
	pool, err := s.loadVocabPool(ctx, examType)
	if err != nil || len(pool) < 4 {
		return nil
	}

	// Prefer items mapped to the requested level; relax stepwise.
	want := strings.ToUpper(strings.TrimSpace(examLevel))
	levelPool := make([]vocabItem, 0, len(pool))
	for _, it := range pool {
		if strings.ToUpper(strings.TrimSpace(it.levelFor(examType))) == want && want != "" {
			levelPool = append(levelPool, it)
		}
	}
	typed := make([]vocabItem, 0, len(pool))
	for _, it := range pool {
		if it.levelFor(examType) != "" {
			typed = append(typed, it)
		}
	}
	use := levelPool
	if len(use) < 4 {
		use = typed
	}
	if len(use) < 4 {
		use = pool
	}

	questions := make([]map[string]interface{}, 0, count)
	used := make(map[string]bool)
	for len(questions) < count {
		// Pick an unused item; allow reuse once everything is exhausted.
		var item *vocabItem
		for tries := 0; tries < len(use)*2; tries++ {
			c := use[rand.Intn(len(use))]
			if !used[c.ID] {
				item = &c
				break
			}
		}
		if item == nil {
			clear(used)
			continue
		}
		used[item.ID] = true

		qt := questionTypes[len(questions)%len(questionTypes)]
		difficulty := "medium"
		if len(difficultyRange) > 0 {
			difficulty = difficultyRange[len(questions)%len(difficultyRange)]
		}

		var prompt, correct string
		var options []string
		switch qt {
		case "pinyin", "reading", "pronunciation":
			reading := item.reading()
			if reading == "" {
				continue // no reading available; try another item
			}
			prompt = fmt.Sprintf("What is the correct reading of '%s'?", item.headword())
			correct = reading
			options = distinctStrings(collectReadings(use, reading), correct, 4)
		case "character", "hanzi", "word":
			prompt = fmt.Sprintf("Which word means '%s'?", item.Translation)
			correct = item.headword()
			options = distinctStrings(collectHeadwords(use, correct), correct, 4)
		default: // "meaning", "listening", anything else
			prompt = fmt.Sprintf("What does '%s' mean?", item.headword())
			correct = item.Translation
			options = distinctStrings(collectTranslations(use, correct), correct, 4)
		}
		if len(options) < 4 {
			continue
		}
		rand.Shuffle(len(options), func(i, j int) {
			options[i], options[j] = options[j], options[i]
		})

		questions = append(questions, map[string]interface{}{
			"id":            fmt.Sprintf("q_%s_%s_%d", examType, examLevel, time.Now().UnixNano()),
			"type":          qt,
			"difficulty":    difficulty,
			"examType":      examType,
			"examLevel":     examLevel,
			"prompt":        prompt,
			"options":       options,
			"correctAnswer": correct,
			"tags":          []string{examType, examLevel, difficulty},
		})
	}
	return questions
}

func collectTranslations(pool []vocabItem, exclude string) []string {
	out := make([]string, 0, len(pool))
	for _, it := range pool {
		if it.Translation != "" && it.Translation != exclude {
			out = append(out, it.Translation)
		}
	}
	return out
}

func collectHeadwords(pool []vocabItem, exclude string) []string {
	out := make([]string, 0, len(pool))
	for _, it := range pool {
		if h := it.headword(); h != "" && h != exclude {
			out = append(out, h)
		}
	}
	return out
}

func collectReadings(pool []vocabItem, exclude string) []string {
	out := make([]string, 0, len(pool))
	for _, it := range pool {
		if r := it.reading(); r != "" && r != exclude {
			out = append(out, r)
		}
	}
	return out
}

func distinctStrings(candidates []string, correct string, n int) []string {
	seen := map[string]bool{correct: true}
	picked := []string{correct}
	// Randomize candidate order before picking.
	rand.Shuffle(len(candidates), func(i, j int) {
		candidates[i], candidates[j] = candidates[j], candidates[i]
	})
	for _, c := range candidates {
		if seen[c] {
			continue
		}
		seen[c] = true
		picked = append(picked, c)
		if len(picked) >= n {
			break
		}
	}
	if len(picked) < n {
		return nil
	}
	return picked
}
