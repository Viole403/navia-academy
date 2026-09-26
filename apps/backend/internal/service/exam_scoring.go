package service

import (
	"fmt"
	"math"
	"sort"
)

// How a question is graded.
//
// A multiple-choice question is right or wrong, so it scores 1 or 0. A matching
// question asks for several pairings at once, and grading it the same way would
// mean a learner who got four of five had to be told they got nothing — which
// is not what the question measures. So scoring returns a fraction and the
// result carries a fractional correct count.
//
// The old comparison was `fmt.Sprintf("%v", user) == fmt.Sprintf("%v", correct)`
// on the whole answer. That happened to work for a single string and nothing
// else: map printing order is not part of any contract worth relying on, and
// two different pairings of the same items are genuinely different answers.

// scoreAnswer returns how much of a question the learner's answer earns, from 0
// to 1. An unanswered question scores 0, which is the same as a wrong one for
// the totals; the counts of answered versus total are reported separately.
func scoreAnswer(qType string, correct, given interface{}) float64 {
	if qType == "matching" {
		return matchingCredit(correct, given)
	}
	if given == nil {
		return 0
	}
	// Compared as text because the wire carries every scalar answer as a
	// string; the alternative is a type switch that has to grow a case for each
	// question type the moment one sends a number.
	return boolToFloat(fmt.Sprintf("%v", given) == fmt.Sprintf("%v", correct))
}

// matchingCredit is the share of pairings the learner got right.
//
// Both sides are keyed by pair id and compared key by key, so the order the
// learner matched in is irrelevant and a partial answer earns partial credit.
// A question with no pairs cannot be answered, so it earns nothing rather than
// dividing by zero.
func matchingCredit(correct, given interface{}) float64 {
	want, ok := correct.(map[string]interface{})
	if !ok || len(want) == 0 {
		return 0
	}
	got, _ := given.(map[string]interface{})
	if len(got) == 0 {
		return 0
	}
	matched := 0
	// Iterate the expected keys rather than the given ones, so an answer with
	// extra keys cannot push the credit above 1.
	ids := make([]string, 0, len(want))
	for id := range want {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	for _, id := range ids {
		if fmt.Sprintf("%v", got[id]) == fmt.Sprintf("%v", want[id]) {
			matched++
		}
	}
	return float64(matched) / float64(len(want))
}

func boolToFloat(b bool) float64 {
	if b {
		return 1
	}
	return 0
}

// toQuestionCounts turns the internal per-hundred tallies back into counts of
// questions, which is the shape the API has always reported.
//
// A matching question is a fraction of a question right, so rounding each
// bucket independently would let the parts disagree with the whole: three
// half-right matching questions would report 2 correct out of 3 while the score
// said 50. Rounding once against the total keeps them consistent, and the
// per-type numbers are the only place a half is visible — the top-level count
// is whole questions by definition.
func toQuestionCounts(tallies map[string]map[string]int) map[string]map[string]int {
	out := make(map[string]map[string]int, len(tallies))
	for key, counts := range tallies {
		total := counts["total"] / 100
		correct := int(math.Round(float64(counts["correct"]) / 100))
		if correct > total {
			correct = total
		}
		if correct < 0 {
			correct = 0
		}
		out[key] = map[string]int{"correct": correct, "total": total}
	}
	return out
}
