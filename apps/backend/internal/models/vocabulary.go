package models

type VocabFilter struct {
	Search     string   `json:"search,omitempty"`
	Hanzi      string   `json:"hanzi,omitempty"`
	Pinyin     string   `json:"pinyin,omitempty"`
	Meaning    string   `json:"meaning,omitempty"`
	ExamType   string   `json:"exam_type,omitempty"`
	ExamLevel  string   `json:"exam_level,omitempty"`
	HasExam    string   `json:"has_exam,omitempty"`
	MinHsk     *int     `json:"min_hsk,omitempty"`
	MaxHsk     *int     `json:"max_hsk,omitempty"`
	Tags       []string `json:"tags,omitempty"`
	Limit      int      `json:"limit,omitempty"`
	Offset     int      `json:"offset,omitempty"`
	SortBy     string   `json:"sort_by,omitempty"`
	SortOrder  string   `json:"sort_order,omitempty"`
}

type ExamComparisonRequest struct {
	Exam1 string `json:"exam1" validate:"required"`
	Exam2 string `json:"exam2" validate:"required"`
}

type AudioRecord struct {
	ID        string `json:"id" db:"id"`
	TextHash  string `json:"text_hash" db:"text_hash"`
	Text      string `json:"text" db:"text"`
	Locale    string `json:"locale" db:"locale"`
	Gender    string `json:"gender" db:"gender"`
	URL       string `json:"url" db:"url"`
	Provider  string `json:"provider" db:"provider"`
	CreatedAt string `json:"created_at" db:"created_at"`
}
