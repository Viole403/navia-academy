package service

import "testing"

// A matching question is the first thing scored as a fraction rather than a
// yes or no, so these pin the arithmetic. The failure that matters is a learner
// who got most of a question right being told they got none of it, and the one
// that is easy to introduce is letting extra keys push credit above 1.

func TestScoreAnswerMultipleChoice(t *testing.T) {
	cases := []struct {
		name  string
		given interface{}
		want  float64
	}{
		{"exact", "hello", 1},
		{"wrong", "goodbye", 0},
		{"unanswered", nil, 0},
		{"case matters", "Hello", 0},
		{"whitespace matters", " hello", 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := scoreAnswer("multiple-choice", "hello", c.given); got != c.want {
				t.Fatalf("score = %v, want %v", got, c.want)
			}
		})
	}
}

func TestScoreAnswerMatching(t *testing.T) {
	correct := map[string]interface{}{
		"p1": "hello", "p2": "goodbye", "p3": "please", "p4": "thanks",
	}
	full := map[string]interface{}{
		"p1": "hello", "p2": "goodbye", "p3": "please", "p4": "thanks",
	}

	cases := []struct {
		name  string
		given interface{}
		want  float64
	}{
		{"all right", full, 1},
		{"none right", map[string]interface{}{
			"p1": "a", "p2": "b", "p3": "c", "p4": "d",
		}, 0},
		{"three of four", map[string]interface{}{
			"p1": "hello", "p2": "goodbye", "p3": "wrong", "p4": "thanks",
		}, 0.75},
		{"half", map[string]interface{}{
			"p1": "hello", "p2": "nope", "p3": "nope", "p4": "nope",
		}, 0.25},
		{"order does not matter", map[string]interface{}{
			"p4": "thanks", "p3": "please", "p2": "goodbye", "p1": "hello",
		}, 1},
		{"unanswered", nil, 0},
		{"empty answer", map[string]interface{}{}, 0},
		{"extra keys cannot inflate credit", map[string]interface{}{
			"p1": "hello", "p2": "goodbye", "p3": "please", "p4": "thanks", "p5": "hello",
		}, 1},
		{"missing keys count as wrong", map[string]interface{}{
			"p1": "hello", "p2": "goodbye",
		}, 0.5},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := scoreAnswer("matching", correct, c.given)
			if diff := got - c.want; diff > 1e-9 || diff < -1e-9 {
				t.Fatalf("credit = %v, want %v", got, c.want)
			}
		})
	}
}

func TestScoreAnswerMatchingWithoutPairs(t *testing.T) {
	// A question with no pairs cannot be answered, so it earns nothing rather
	// than dividing by zero.
	if got := scoreAnswer("matching", map[string]interface{}{}, map[string]interface{}{"a": "b"}); got != 0 {
		t.Fatalf("empty pairs credit = %v, want 0", got)
	}
	if got := scoreAnswer("matching", "not a map", map[string]interface{}{"a": "b"}); got != 0 {
		t.Fatalf("malformed expected value credit = %v, want 0", got)
	}
}

func TestToQuestionCounts(t *testing.T) {
	// Internally per hundred; reported as whole questions.
	got := toQuestionCounts(map[string]map[string]int{
		"multiple-choice": {"correct": 300, "total": 400},
		"matching":        {"correct": 175, "total": 200},
	})

	if got["multiple-choice"]["correct"] != 3 || got["multiple-choice"]["total"] != 4 {
		t.Fatalf("multiple-choice = %v, want 3/4", got["multiple-choice"])
	}
	// 1.75 questions rounds to 2 and is clamped to the 2 that were asked.
	if got["matching"]["correct"] != 2 || got["matching"]["total"] != 2 {
		t.Fatalf("matching = %v, want 2/2", got["matching"])
	}
}

func TestToQuestionCountsNeverExceedsTotal(t *testing.T) {
	// Rounding must not be able to report more right than were asked.
	got := toQuestionCounts(map[string]map[string]int{
		"matching": {"correct": 190, "total": 200}, // 1.9 of 2
	})
	if got["matching"]["correct"] > got["matching"]["total"] {
		t.Fatalf("correct %d exceeds total %d", got["matching"]["correct"], got["matching"]["total"])
	}
}
