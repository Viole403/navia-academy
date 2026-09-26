package service

import (
	"context"
	"testing"
)

// The sample generator is the path taken when the CDN is unreachable, so it is
// what a learner sees during an outage. It is still an exam: the options have to
// be distinct and the marked answer has to be the true one.
func TestSampleQuestionsFillBlankHasDistinctOptions(t *testing.T) {
	s := NewExamService(nil)
	qs := s.sampleQuestions("hsk", "1", 4, []string{"fill_blank"}, []string{"easy"})

	if len(qs) == 0 {
		t.Fatal("expected sample questions")
	}
	for _, q := range qs {
		opts, _ := q["options"].([]string)
		if len(opts) != 4 {
			t.Fatalf("expected 4 options, got %d: %v", len(opts), opts)
		}
		seen := map[string]bool{}
		for _, o := range opts {
			if seen[o] {
				t.Fatalf("duplicate option %q in %v", o, opts)
			}
			seen[o] = true
		}
		correct, _ := q["correctAnswer"].(string)
		if !seen[correct] {
			t.Fatalf("correctAnswer %q is not among the options %v", correct, opts)
		}
	}
}

// 示例 is read shìlì. The other three candidates are tone errors on purpose, so
// the marked answer must always be the real reading no matter where it lands in
// the shuffled list.
func TestSampleQuestionsPronunciationMarksTheRealReading(t *testing.T) {
	s := NewExamService(nil)
	// Run enough times that a random choice would surface the bug.
	for i := 0; i < 50; i++ {
		qs := s.sampleQuestions("hsk", "1", 4, []string{"pronunciation"}, []string{"easy"})
		for _, q := range qs {
			correct, _ := q["correctAnswer"].(string)
			if correct != "shìlì" {
				t.Fatalf("iteration %d: correctAnswer = %q, want shìlì", i, correct)
			}
			opts, _ := q["options"].([]string)
			if len(opts) != 4 {
				t.Fatalf("expected 4 options, got %d", len(opts))
			}
			found := false
			for _, o := range opts {
				if o == correct {
					found = true
				}
			}
			if !found {
				t.Fatalf("correctAnswer %q missing from %v", correct, opts)
			}
		}
	}
}

func TestSampleQuestionsAnswerAlwaysAmongOptions(t *testing.T) {
	s := NewExamService(nil)
	types := []string{"meaning", "listening", "character", "reading", "unknown_type"}
	qs := s.sampleQuestions("hsk", "2", 5, types, []string{"easy", "medium", "hard"})

	if len(qs) == 0 {
		t.Fatal("expected sample questions")
	}
	for _, q := range qs {
		correct, _ := q["correctAnswer"].(string)
		opts, _ := q["options"].([]string)
		found := false
		for _, o := range opts {
			if o == correct {
				found = true
			}
		}
		if !found {
			t.Fatalf("correctAnswer %q missing from %v", correct, opts)
		}
	}
}

// generateQuestions has to fall through to samples when the content CDN is not
// configured, without panicking on the nil repo path.
func TestGenerateQuestionsFallsBackWhenNoContentBaseURL(t *testing.T) {
	s := NewExamService(nil)
	qs := s.generateQuestions(context.Background(), "hsk", "1", 3,
		[]string{"meaning"}, []string{"easy"})

	if len(qs) != 3 {
		t.Fatalf("expected 3 questions, got %d", len(qs))
	}
}
