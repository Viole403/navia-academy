package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"time"

	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
)

type ExamService struct {
	examRepo *repository.ExamRepository
}

func NewExamService(examRepo *repository.ExamRepository) *ExamService {
	return &ExamService{examRepo: examRepo}
}

const CatEngineVersion = "elo-v1"

func (s *ExamService) CreateCatSession(ctx context.Context, userID string, req *models.CatSessionCreateRequest) (*models.CatSession, error) {
	capSec := req.TimeLimitSec
	if capSec <= 0 {
		capSec = 1200 // CAT umum default (web mengirim cap sesungguhnya dari §9.1)
	}
	sess := &models.CatSession{
		UserID:      userID,
		ExamType:    req.ExamType,
		StartTheta:  req.StartTheta,
		Status:      "in_progress",
		EngineVersion: CatEngineVersion,
		TimeLimitSec: capSec,
	}
	return s.examRepo.CreateCatSession(ctx, sess)
}

func (s *ExamService) PatchCatSession(ctx context.Context, sessionID int, userID string, req *models.CatSessionPatchRequest) error {
	// server-side dedupe by item_id (idempotent replay/retry)
	seen := make(map[string]bool)
	out := make([]models.CatAnswer, 0, len(req.Answers))
	for _, a := range req.Answers {
		if a.ItemID == "" || seen[a.ItemID] {
			continue
		}
		seen[a.ItemID] = true
		out = append(out, a)
	}
	return s.examRepo.PatchCatSession(ctx, sessionID, userID, out, req.ElapsedSec, req.Theta)
}

func (s *ExamService) GetCatSession(ctx context.Context, sessionID int, userID string) (*models.CatSession, error) {
	return s.examRepo.GetCatSession(ctx, sessionID, userID)
}

func (s *ExamService) SaveCatResult(ctx context.Context, userID string, req *models.CatResultRequest) (*models.CatResult, error) {
	// Server-side recompute: never trust the client's self-reported
	// Elo/scores. Derive everything from the submitted answer log so a
	// forged elo_estimate / correct_answers payload has no effect.
	elo, correct, total := recomputeCatRating(req.Answers, req.StartTheta)
	res := &models.CatResult{
		UserID:         userID,
		ExamType:       req.ExamType,
		ExamLevel:      req.ExamLevel,
		EloEstimate:    elo,
		EloSD:          req.EloSD,
		CefrBand:       req.CefrBand,
		TotalQuestions: total,
		CorrectAnswers: correct,
		TimeTaken:      req.TimeTaken,
		Answers:        req.Answers,
		EngineVersion:  CatEngineVersion,
		IntegrityFlag:  req.IntegrityFlag,
	}
	// Elo estimate is authoritative from recompute; band derived from it.
	res.CefrBand = cefrBandOf(elo)
	return s.examRepo.CreateCatResult(ctx, res)
}

// recomputeCatRating replays the CAT answer log with the same Elo update
// rule as the client (apps/web/src/lib/elo.ts) to produce a server-side
// authoritative rating, correct count, and question total. Mirrors
// eloUpdate() (K-factor decay) and the Elo expected-score formula.
func recomputeCatRating(answers []models.CatAnswer, startTheta float64) (elo float64, correct, total int) {
	theta := startTheta
	if theta == 0 {
		theta = 550 // DEFAULT_ELO
	}
	for _, a := range answers {
		theta = eloUpdate(theta, a.ItemElo, a.Correct, total)
		if a.Correct {
			correct++
		}
		total++
	}
	return theta, correct, total
}

// eloUpdate mirrors the client's K-factor decay update: k = max(4, 36 - 2n).
func eloUpdate(theta, itemElo float64, correct bool, questionsAnswered int) float64 {
	k := 36 - questionsAnswered*2
	if k < 4 {
		k = 4
	}
	expected := 1 / (1 + math.Pow(10, (itemElo-theta)/400))
	actual := 0.0
	if correct {
		actual = 1
	}
	return theta + float64(k)*(actual-expected)
}

// cefrBandOf maps an Elo rating to a CEFR band (mirrors elo.ts CEFR_BANDS).
func cefrBandOf(elo float64) string {
	switch {
	case elo < 700:
		return "A1"
	case elo < 1000:
		return "A2"
	case elo < 1300:
		return "B1"
	case elo < 1700:
		return "B2"
	case elo < 2000:
		return "C1"
	default:
		return "C2"
	}
}

func (s *ExamService) GetCatProgress(ctx context.Context, userID string) ([]models.CatResult, error) {
	return s.examRepo.GetCatProgress(ctx, userID)
}

func (s *ExamService) CreateSession(ctx context.Context, userID, examType, examLevel string, settings map[string]interface{}) (*models.ExamSession, error) {
	questionCount := 20
	questionTypes := []string{"multiple_choice", "fill_blank", "pronunciation"}
	difficultyRange := []string{"easy", "medium", "hard"}
	var timeLimit *int
	tl := 1800
	timeLimit = &tl

	if settings != nil {
		if qc, ok := settings["questionCount"].(float64); ok {
			questionCount = int(qc)
		}
		if qt, ok := settings["questionTypes"].([]interface{}); ok {
			questionTypes = make([]string, len(qt))
			for i, v := range qt {
				questionTypes[i] = fmt.Sprintf("%v", v)
			}
		}
		if dr, ok := settings["difficultyRange"].([]interface{}); ok {
			difficultyRange = make([]string, len(dr))
			for i, v := range dr {
				difficultyRange[i] = fmt.Sprintf("%v", v)
			}
		}
		if tlVal, ok := settings["timeLimit"].(float64); ok {
			t := int(tlVal)
			timeLimit = &t
		}
	}

	questions := s.generateQuestions(examType, examLevel, questionCount, questionTypes, difficultyRange)
	questionsJSON, _ := json.Marshal(questions)
	answersJSON, _ := json.Marshal(make(map[string]interface{}))
	qtJSON, _ := json.Marshal(questionTypes)
	drJSON, _ := json.Marshal(difficultyRange)

	session := &models.ExamSession{
		UserID:              userID,
		ExamType:            examType,
		ExamLevel:           examLevel,
		Status:              "in_progress",
		CurrentQuestionIndex: 0,
		Questions:           (*json.RawMessage)(&questionsJSON),
		Answers:             (*json.RawMessage)(&answersJSON),
		StartedAt:           time.Now(),
		TimeLimit:           timeLimit,
		TimeRemaining:       timeLimit,
		QuestionCount:       questionCount,
		QuestionTypes:       (*json.RawMessage)(&qtJSON),
		DifficultyRange:     (*json.RawMessage)(&drJSON),
	}

	return s.examRepo.CreateSession(ctx, session)
}

func (s *ExamService) GetSession(ctx context.Context, sessionID int, userID string) (*models.ExamSession, error) {
	return s.examRepo.GetSessionByID(ctx, sessionID, userID)
}

func (s *ExamService) GetSessionByID(ctx context.Context, sessionID int, userID string) (*models.ExamSession, error) {
	return s.examRepo.GetSessionByID(ctx, sessionID, userID)
}

func (s *ExamService) SubmitAnswer(ctx context.Context, sessionID int, userID string, questionID string, answer interface{}) (*models.ExamSession, error) {
	session, err := s.examRepo.GetSessionByID(ctx, sessionID, userID)
	if err != nil {
		return nil, err
	}

	if session.Status != "in_progress" {
		return nil, fmt.Errorf("exam session is not in progress")
	}

	answers := make(map[string]interface{})
	if session.Answers != nil {
		json.Unmarshal(*session.Answers, &answers)
	}
	answers[questionID] = answer
	answersJSON, _ := json.Marshal(answers)
	session.Answers = (*json.RawMessage)(&answersJSON)

	session.CurrentQuestionIndex++

	if err := s.examRepo.UpdateSession(ctx, session); err != nil {
		return nil, err
	}

	return session, nil
}

func (s *ExamService) SubmitExam(ctx context.Context, sessionID int, userID string) (*models.ExamResult, error) {
	session, err := s.examRepo.GetSessionByID(ctx, sessionID, userID)
	if err != nil {
		return nil, err
	}

	if session.Status == "completed" {
		return nil, fmt.Errorf("exam already completed")
	}

	now := time.Now()
	session.Status = "completed"
	session.CompletedAt = &now

	answers := make(map[string]interface{})
	if session.Answers != nil {
		json.Unmarshal(*session.Answers, &answers)
	}

	questions := make([]map[string]interface{}, 0)
	if session.Questions != nil {
		json.Unmarshal(*session.Questions, &questions)
	}

	result := s.calculateScore(session, questions, answers, now)

	if err := s.examRepo.UpdateSession(ctx, session); err != nil {
		return nil, err
	}

	savedResult, err := s.examRepo.CreateResult(ctx, result)
	if err != nil {
		return nil, err
	}

	s.updateExamProgress(ctx, userID, session.ExamType, result)

	return savedResult, nil
}

func (s *ExamService) AbandonExam(ctx context.Context, sessionID int, userID string) (*models.ExamSession, error) {
	session, err := s.examRepo.GetSessionByID(ctx, sessionID, userID)
	if err != nil {
		return nil, err
	}

	if session.Status == "completed" {
		return nil, fmt.Errorf("cannot abandon completed exam")
	}

	now := time.Now()
	session.Status = "abandoned"
	session.CompletedAt = &now

	if err := s.examRepo.UpdateSession(ctx, session); err != nil {
		return nil, err
	}

	return session, nil
}

func (s *ExamService) GetExamHistory(ctx context.Context, userID, examType string, limit, offset int) ([]models.ExamResult, int64, error) {
	return s.examRepo.GetExamHistory(ctx, userID, examType, limit, offset)
}

func (s *ExamService) GetUserProgress(ctx context.Context, userID string) ([]models.ExamProgress, error) {
	return s.examRepo.GetUserExamProgress(ctx, userID)
}

func (s *ExamService) GetActiveSessions(ctx context.Context, userID string) ([]models.ExamSession, error) {
	return s.examRepo.GetActiveSessions(ctx, userID)
}

func (s *ExamService) GetRecommendedExam(ctx context.Context, userID string) (map[string]string, error) {
	progress, err := s.examRepo.GetUserExamProgress(ctx, userID)
	if err != nil || len(progress) == 0 {
		return map[string]string{
			"examType":  "hsk",
			"examLevel": "1",
			"reason":    "Start with HSK Level 1 as a beginner",
		}, nil
	}

	recommendedExam := "hsk"
	recommendedLevel := "1"

	for _, p := range progress {
		var levelsCompleted []string
		if p.LevelsCompleted != nil {
			json.Unmarshal(*p.LevelsCompleted, &levelsCompleted)
		}
		if len(levelsCompleted) > 0 {
			highest := levelsCompleted[len(levelsCompleted)-1]
			numericLevel := 0
			fmt.Sscanf(highest, "%d", &numericLevel)
			if numericLevel > 0 && numericLevel < 7 {
				recommendedExam = p.ExamType
				recommendedLevel = fmt.Sprintf("%d", numericLevel+1)
				break
			}
		}
	}

	return map[string]string{
		"examType":  recommendedExam,
		"examLevel": recommendedLevel,
		"reason":    fmt.Sprintf("Continue with %s Level %s based on your progress", recommendedExam, recommendedLevel),
	}, nil
}

func (s *ExamService) generateQuestions(examType, examLevel string, count int, questionTypes, difficultyRange []string) []map[string]interface{} {
	questions := make([]map[string]interface{}, 0)
	typesPerQuestion := int(math.Ceil(float64(count) / float64(len(questionTypes))))

	for _, qt := range questionTypes {
		for i := 0; i < typesPerQuestion && len(questions) < count; i++ {
			difficulty := difficultyRange[rand.Intn(len(difficultyRange))]

			q := map[string]interface{}{
				"id":         fmt.Sprintf("q_%s_%s_%d_%d", examType, examLevel, time.Now().UnixNano(), i),
				"type":       qt,
				"difficulty": difficulty,
				"examType":   examType,
				"examLevel":  examLevel,
				"prompt":     fmt.Sprintf("Sample %s question for %s level %s", qt, examType, examLevel),
				"options":    []string{"Option A", "Option B", "Option C", "Option D"},
				"correctAnswer": "Option A",
				"tags":       []string{examType, examLevel, difficulty},
			}

			if qt == "fill_blank" {
				q["prompt"] = fmt.Sprintf("Fill in the blank: ________ is a Chinese word for level %s.", examLevel)
				q["correctAnswer"] = "示例"
			} else if qt == "pronunciation" {
				q["prompt"] = fmt.Sprintf("What is the correct pinyin for the word '示例'?")
				q["options"] = []string{"shìlì", "shílì", "shìlí", "shíli"}
				q["correctAnswer"] = "shìlì"
			}

			questions = append(questions, q)
		}
	}

	rand.Shuffle(len(questions), func(i, j int) {
		questions[i], questions[j] = questions[j], questions[i]
	})

	return questions[:int(math.Min(float64(len(questions)), float64(count)))]
}

func (s *ExamService) calculateScore(session *models.ExamSession, questions []map[string]interface{}, answers map[string]interface{}, completedAt time.Time) *models.ExamResult {
	correctAnswers := 0
	byType := make(map[string]map[string]int)
	byDifficulty := make(map[string]map[string]int)

	totalQuestions := len(questions)
	timeTaken := int(completedAt.Sub(session.StartedAt).Seconds())

	for _, q := range questions {
		qID, _ := q["id"].(string)
		qType, _ := q["type"].(string)
		qDiff, _ := q["difficulty"].(string)
		correctAns, _ := q["correctAnswer"]

		if _, ok := byType[qType]; !ok {
			byType[qType] = map[string]int{"correct": 0, "total": 0}
		}
		if _, ok := byDifficulty[qDiff]; !ok {
			byDifficulty[qDiff] = map[string]int{"correct": 0, "total": 0}
		}

		byType[qType]["total"]++
		byDifficulty[qDiff]["total"]++

		userAns, answered := answers[qID]
		if answered && fmt.Sprintf("%v", userAns) == fmt.Sprintf("%v", correctAns) {
			correctAnswers++
			byType[qType]["correct"]++
			byDifficulty[qDiff]["correct"]++
		}
	}

	score := 0
	if totalQuestions > 0 {
		score = int(math.Round(float64(correctAnswers) / float64(totalQuestions) * 100))
	}

	avgTimePerQuestion := 0
	if totalQuestions > 0 {
		avgTimePerQuestion = timeTaken / totalQuestions
	}

	weakAreas := make([]string, 0)
	strengths := make([]string, 0)

	for qType, stats := range byType {
		if stats["total"] > 0 && float64(stats["correct"])/float64(stats["total"]) < 0.6 {
			weakAreas = append(weakAreas, qType+" questions")
		}
	}

	for diff, stats := range byDifficulty {
		if stats["total"] > 0 && float64(stats["correct"])/float64(stats["total"]) >= 0.8 {
			strengths = append(strengths, diff+" difficulty")
		}
	}

	var recommendedNextLevel *string
	if score >= 80 {
		levels := []string{"1", "2", "3", "4", "5", "6", "7"}
		for i, l := range levels {
			if l == session.ExamLevel && i < len(levels)-1 {
				next := levels[i+1]
				recommendedNextLevel = &next
				break
			}
		}
	}

	bqJSON, _ := json.Marshal(byType)
	bdJSON, _ := json.Marshal(byDifficulty)
	waJSON, _ := json.Marshal(weakAreas)
	stJSON, _ := json.Marshal(strengths)

	return &models.ExamResult{
		SessionID:            session.ID,
		UserID:               session.UserID,
		ExamType:             session.ExamType,
		ExamLevel:            session.ExamLevel,
		TotalQuestions:       totalQuestions,
		CorrectAnswers:       correctAnswers,
		Score:                score,
		PassingScore:         60,
		ByQuestionType:       (*json.RawMessage)(&bqJSON),
		ByDifficulty:         (*json.RawMessage)(&bdJSON),
		TimeTaken:            timeTaken,
		AverageTimePerQuestion: avgTimePerQuestion,
		RecommendedNextLevel: recommendedNextLevel,
		WeakAreas:            (*json.RawMessage)(&waJSON),
		Strengths:            (*json.RawMessage)(&stJSON),
	}
}

func (s *ExamService) updateExamProgress(ctx context.Context, userID, examType string, result *models.ExamResult) {
	progress, _ := s.examRepo.GetUserExamProgress(ctx, userID)

	var existing *models.ExamProgress
	for i, p := range progress {
		if p.ExamType == examType {
			existing = &progress[i]
			break
		}
	}

	if existing == nil {
		levelsCompleted := []string{}
		lcJSON, _ := json.Marshal(levelsCompleted)
		byLevelJSON, _ := json.Marshal(make(map[string]interface{}))
		wqJSON, _ := json.Marshal([]string{})
		wdJSON, _ := json.Marshal([]string{})

		currentLevel := result.ExamLevel

		examProgress := &models.ExamProgress{
			UserID:              userID,
			ExamType:            examType,
			LevelsCompleted:     (*json.RawMessage)(&lcJSON),
			CurrentLevel:        &currentLevel,
			HighestScore:        result.Score,
			AverageScore:        result.Score,
			TotalAttempts:       1,
			ByLevel:             (*json.RawMessage)(&byLevelJSON),
			WeakQuestionTypes:   (*json.RawMessage)(&wqJSON),
			WeakDifficultyLevels: (*json.RawMessage)(&wdJSON),
		}

		if result.Score >= 60 {
			lcJSON, _ = json.Marshal([]string{result.ExamLevel})
			examProgress.LevelsCompleted = (*json.RawMessage)(&lcJSON)
		}

		s.examRepo.UpsertExamProgress(ctx, examProgress)
	} else {
		existing.TotalAttempts++
		if result.Score > existing.HighestScore {
			existing.HighestScore = result.Score
		}
		existing.AverageScore = (existing.AverageScore*(existing.TotalAttempts-1) + result.Score) / existing.TotalAttempts

		if result.Score >= 60 {
			var lc []string
			json.Unmarshal(*existing.LevelsCompleted, &lc)
			found := false
			for _, l := range lc {
				if l == result.ExamLevel {
					found = true
					break
				}
			}
			if !found {
				lc = append(lc, result.ExamLevel)
				lcJSON, _ := json.Marshal(lc)
				existing.LevelsCompleted = (*json.RawMessage)(&lcJSON)
			}
		}

		s.examRepo.UpsertExamProgress(ctx, existing)
	}
}
