package service

import "testing"

// de/en store IPA in `pronunciation`, which cannot be offered as an answer to
// "which reading is this?" — that made German papers unanswerable.
func TestReadingIsScriptAware(t *testing.T) {
	cases := []struct {
		name string
		item vocabItem
		want string
	}{
		{"han pinyin", vocabItem{Language: "zh", Pinyin: "rén"}, "rén"},
		{"german ipa", vocabItem{Language: "de", Text: "vorne", Pronunciation: []string{"ˈfɔʁnə"}}, ""},
		{"english ipa", vocabItem{Language: "en", Text: "hello", Pronunciation: []string{"həˈləʊ"}}, ""},
		{"japanese kana", vocabItem{Language: "ja", Text: "アイス", Pronunciation: []string{"アイス"}}, "アイス"},
		{"missing language", vocabItem{Text: "ab", Pronunciation: []string{"ʔap"}}, ""},
		{"pinyin wins for han", vocabItem{Language: "zh", Pinyin: "rén", Pronunciation: []string{"ren"}}, "rén"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.item.reading(); got != tc.want {
				t.Fatalf("reading() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestReadingSlotOnlyForNonLatinExams(t *testing.T) {
	for _, tc := range []struct {
		examType   string
		wantPinyin bool
	}{
		{"hsk", true}, {"tocfl", true}, {"jlpt", true},
		{"goethe", false}, {"toefl", false},
	} {
		lang := examLangOf(tc.examType)
		if got := lang == "zh" || lang == "ja"; got != tc.wantPinyin {
			t.Errorf("%s (lang %q): reading slot = %v, want %v",
				tc.examType, lang, got, tc.wantPinyin)
		}
	}
}
