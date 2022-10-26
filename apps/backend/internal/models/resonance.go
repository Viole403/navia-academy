package models

import "time"

// Resonance emotions are the defined, closable set a learner can attach to a
// word origin (radical / head character). They mirror the usage-semantic set
// already carried by content (register + tags): formal/正式 → inspired, informal/口语
// → warm, dialect/方言 → nostalgic, neutral → curious, plus calm & excited.
var ResonanceEmotions = []string{"inspired", "warm", "curious", "nostalgic", "calm", "excited"}

var resonanceEmotionSet = func() map[string]bool {
	m := make(map[string]bool, len(ResonanceEmotions))
	for _, e := range ResonanceEmotions {
		m[e] = true
	}
	return m
}()

// NormalizeResonanceEmotion canonicalizes accepted spellings of the same
// feeling (e.g. "touched" → "warm") and reports whether the result is valid.
func NormalizeResonanceEmotion(raw string) (string, bool) {
	aliases := map[string]string{
		"touched": "warm", "moved": "warm", "melting": "warm",
		"fired": "excited", "pumped": "excited",
		"reminiscent": "nostalgic",
		"amazed":      "inspired", "awed": "inspired",
		"wonder": "curious", "intrigued": "curious",
		"zen":    "calm", "peaceful": "calm",
	}
	emotion := raw
	if alt, ok := aliases[raw]; ok {
		emotion = alt
	}
	if _, ok := resonanceEmotionSet[emotion]; !ok {
		return "", false
	}
	return emotion, true
}

// ResonanceEvent is the payload a learner sends when reacting to an origin.
type ResonanceEvent struct {
	Origin    string `json:"origin"`
	Emotion   string `json:"emotion"`
	Intensity int    `json:"intensity"`
}

// ResonanceReaction is a persisted row.
type ResonanceReaction struct {
	ID        int64     `json:"id" db:"id"`
	Origin    string    `json:"origin" db:"origin"`
	Emotion   string    `json:"emotion" db:"emotion"`
	UserID    string    `json:"user_id" db:"user_id"`
	Intensity int       `json:"intensity" db:"intensity"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// ResonanceOrigin aggregates one origin's resonance: violet `Total` is the
// all-time depth, turquoise `Live` is the 24h pulse.
type ResonanceOrigin struct {
	Origin  string            `json:"origin"`
	Emotion map[string]int64  `json:"emotion,omitempty"`
	Live    map[string]int64  `json:"live,omitempty"`
	Total   map[string]int64  `json:"total,omitempty"`
}

// ResonanceHot is one row of the all-origins live leaderboard.
type ResonanceHot struct {
	Origin string `json:"origin"`
	Live   int64  `json:"live"`
	Total  int64  `json:"total"`
}