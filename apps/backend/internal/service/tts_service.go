package service

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"

	singleflight "golang.org/x/sync/singleflight"

	edgetts "github.com/foresturquhart/edge-tts"
	"github.com/google/uuid"
	"github.com/navia-academy/backend/internal/config"
	"github.com/navia-academy/backend/internal/models"
	"github.com/navia-academy/backend/internal/repository"
	"github.com/navia-academy/backend/pkg/storage"
)

type TTSEngine interface {
	Synthesize(text, locale, gender string) ([]byte, error)
	Name() string
}

type TTSService struct {
	engines   []TTSEngine
	store     *storage.StorageService
	audioRepo *repository.AudioRepository
	httpCli   *http.Client
	group     singleflight.Group // dedups concurrent synthesis per text+locale+gender
}

func NewTTSService(cfg config.TTSConfig, store *storage.StorageService, audioRepo *repository.AudioRepository) *TTSService {
	svc := &TTSService{
		store:     store,
		audioRepo: audioRepo,
		httpCli:   &http.Client{Timeout: 30 * time.Second},
	}

	engines := make([]TTSEngine, 0)

	switch cfg.Engine {
	case "edge":
		engines = append(engines, &edgeTTSEngine{httpCli: svc.httpCli})
		if cfg.GoogleKey != "" {
			engines = append(engines, &googleTTSEngine{apiKey: cfg.GoogleKey, httpCli: svc.httpCli})
		}
		if cfg.AzureKey != "" {
			engines = append(engines, &azureTTSEngine{key: cfg.AzureKey, region: cfg.AzureRegion, httpCli: svc.httpCli})
		}
	case "google":
		if cfg.GoogleKey != "" {
			engines = append(engines, &googleTTSEngine{apiKey: cfg.GoogleKey, httpCli: svc.httpCli})
		}
		engines = append(engines, &edgeTTSEngine{httpCli: svc.httpCli})
		if cfg.AzureKey != "" {
			engines = append(engines, &azureTTSEngine{key: cfg.AzureKey, region: cfg.AzureRegion, httpCli: svc.httpCli})
		}
	case "azure":
		if cfg.AzureKey != "" {
			engines = append(engines, &azureTTSEngine{key: cfg.AzureKey, region: cfg.AzureRegion, httpCli: svc.httpCli})
		}
		engines = append(engines, &edgeTTSEngine{httpCli: svc.httpCli})
		if cfg.GoogleKey != "" {
			engines = append(engines, &googleTTSEngine{apiKey: cfg.GoogleKey, httpCli: svc.httpCli})
		}
	default:
		engines = append(engines, &edgeTTSEngine{httpCli: svc.httpCli})
		if cfg.GoogleKey != "" {
			engines = append(engines, &googleTTSEngine{apiKey: cfg.GoogleKey, httpCli: svc.httpCli})
		}
		if cfg.AzureKey != "" {
			engines = append(engines, &azureTTSEngine{key: cfg.AzureKey, region: cfg.AzureRegion, httpCli: svc.httpCli})
		}
	}

	svc.engines = engines
	return svc
}

func (s *TTSService) Synthesize(ctx context.Context, text, locale, gender string) (*models.AudioRecord, error) {
	if locale == "" {
		locale = "zh-CN"
	}
	if gender == "" {
		gender = "female"
	}

	textHash := s.hashKey(text, locale, gender)

	existing, err := s.audioRepo.FindByTextHash(ctx, textHash)
	if err == nil && existing != nil {
		return existing, nil
	}

	// singleflight dedups concurrent requests for the same text+locale+gender:
	// callers share one synthesis instead of each hitting the providers, so we
	// never produce duplicate audio or orphaned locks.
	v, err, _ := s.group.Do(textHash, func() (interface{}, error) {
		// Double-check inside the critical section — another caller may have
		// already synthesized and persisted this text while we were queued.
		if existing, ferr := s.audioRepo.FindByTextHash(ctx, textHash); ferr == nil && existing != nil {
			return existing, nil
		}

		var lastErr error
		for _, engine := range s.engines {
			audioData, err := engine.Synthesize(text, locale, gender)
			if err != nil {
				lastErr = err
				continue
			}
			objectKey := fmt.Sprintf("audio/%s.mp3", textHash)
			publicURL, err := s.store.Upload(ctx, objectKey, audioData, "audio/mpeg")
			if err != nil {
				return nil, fmt.Errorf("upload audio: %w", err)
			}

			record := &models.AudioRecord{
				ID:        uuid.New().String(),
				TextHash:  textHash,
				Text:      text,
				Locale:    locale,
				Gender:    gender,
				URL:       publicURL,
				Provider:  engine.Name(),
				CreatedAt: time.Now().UTC().Format(time.RFC3339),
			}

			if saveErr := s.audioRepo.Save(ctx, record); saveErr != nil {
				// Audio was generated + uploaded; surface the persistence
				// failure but still return the usable record to the caller.
				log.Printf("tts: failed to persist audio record %s: %v", textHash, saveErr)
			}

			return record, nil
		}
		return nil, fmt.Errorf("all TTS providers failed: %w", lastErr)
	})
	if err != nil {
		return nil, err
	}
	return v.(*models.AudioRecord), nil
}

func (s *TTSService) hashKey(text, locale, gender string) string {
	h := sha256.Sum256([]byte(fmt.Sprintf("%s::%s::%s", text, locale, gender)))
	return fmt.Sprintf("%x", h[:16])
}

func (s *TTSService) GetVoiceURL(ctx context.Context, text, locale, gender string) (string, error) {
	record, err := s.Synthesize(ctx, text, locale, gender)
	if err != nil {
		return "", err
	}
	return record.URL, nil
}

type VoiceLocale string
type VoiceGender string

var voiceLocaleMap = map[string]string{
	"hsk":    "zh-CN",
	"tocfl":  "zh-TW",
	"goethe": "de-DE",
	"jlpt":   "ja-JP",
	"toefl":  "en-US",
}

func (s *TTSService) ResolveLocale(examType string) string {
	if l, ok := voiceLocaleMap[examType]; ok {
		return l
	}
	return "zh-CN"
}

func (s *TTSService) HandleTTSRequest(ctx context.Context, data json.RawMessage) (string, error) {
	var req struct {
		Text   string `json:"text"`
		Locale string `json:"locale"`
		Gender string `json:"gender"`
	}
	if err := json.Unmarshal(data, &req); err != nil {
		return "", fmt.Errorf("invalid request: %w", err)
	}
	if req.Locale == "" {
		req.Locale = "zh-CN"
	}
	if req.Gender == "" {
		req.Gender = "female"
	}
	return s.GetVoiceURL(ctx, req.Text, req.Locale, req.Gender)
}

type voiceCfg struct {
	VoiceName string
	Rate      string
}

var azureVoiceMap = map[string]map[string]voiceCfg{
	"zh-CN": {
		"female": {VoiceName: "zh-CN-XiaoxiaoNeural", Rate: "-15%"},
		"male":   {VoiceName: "zh-CN-YunxiNeural", Rate: "-10%"},
	},
	"zh-TW": {
		"female": {VoiceName: "zh-TW-HsiaoChenNeural", Rate: "-15%"},
		"male":   {VoiceName: "zh-TW-YunJheNeural", Rate: "-10%"},
	},
	"zh-HK": {
		"female": {VoiceName: "zh-HK-HiuGaaiNeural", Rate: "-15%"},
		"male":   {VoiceName: "zh-HK-WanLungNeural", Rate: "-10%"},
	},
}

// edgeVoiceMap mirrors apps/web/src/data/audio/voice-map.ts so the Go backend
// produces the same voices as the web audio generation script.
var edgeVoiceMap = map[string]map[string]string{
	"zh-CN": {
		"female": "zh-CN-XiaoxiaoNeural",
		"male":   "zh-CN-YunxiNeural",
	},
	"zh-TW": {
		"female": "zh-TW-HsiaoYuNeural",
		"male":   "zh-TW-YunJheNeural",
	},
	"zh-HK": {
		"female": "zh-HK-HiuGaaiNeural",
		"male":   "zh-HK-WanLungNeural",
	},
}

type edgeTTSEngine struct {
	httpCli *http.Client
}

func (e *edgeTTSEngine) Name() string { return "edge" }

func (e *edgeTTSEngine) Synthesize(text, locale, gender string) ([]byte, error) {
	voice, ok := edgeVoiceMap[locale][gender]
	if !ok {
		voice = edgeVoiceMap["zh-CN"]["female"]
	}

	cfg := edgetts.DefaultConfig()
	cfg.Voice = voice

	comm, err := edgetts.NewCommunicate(text, cfg)
	if err != nil {
		return nil, fmt.Errorf("edge tts: %w", err)
	}

	var buf bytes.Buffer
	err = comm.Stream(context.Background(), func(chunk edgetts.TTSChunk) error {
		if chunk.Type == edgetts.ChunkTypeAudio {
			buf.Write(chunk.Data)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("edge tts api: %w", err)
	}

	return buf.Bytes(), nil
}

type googleTTSEngine struct {
	apiKey  string
	httpCli *http.Client
}

func (e *googleTTSEngine) Name() string { return "google" }

func (e *googleTTSEngine) Synthesize(text, locale, gender string) ([]byte, error) {
	if e.apiKey == "" {
		return nil, fmt.Errorf("google tts api key not configured")
	}

	voiceName := "zh-CN-Standard-A"
	if gender == "male" {
		voiceName = "zh-CN-Standard-B"
	}

	reqBody := map[string]interface{}{
		"input": map[string]string{"text": text},
		"voice": map[string]string{
			"languageCode": locale,
			"name":         voiceName,
		},
		"audioConfig": map[string]interface{}{
			"audioEncoding": "MP3",
		},
	}
	payload, _ := json.Marshal(reqBody)

	u := fmt.Sprintf("https://texttospeech.googleapis.com/v1/text:synthesize?key=%s", url.QueryEscape(e.apiKey))
	req, err := http.NewRequest("POST", u, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("google tts request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := e.httpCli.Do(req)
	if err != nil {
		return nil, fmt.Errorf("google tts api: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("google tts error %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		AudioContent string `json:"audioContent"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("google tts decode: %w", err)
	}

	return []byte(result.AudioContent), nil
}

type azureTTSEngine struct {
	key     string
	region  string
	httpCli *http.Client
}

func (e *azureTTSEngine) Name() string { return "azure" }

func (e *azureTTSEngine) Synthesize(text, locale, gender string) ([]byte, error) {
	if e.key == "" {
		return nil, fmt.Errorf("azure speech key not configured")
	}

	voiceCfg, ok := azureVoiceMap[locale]
	if !ok {
		voiceCfg = azureVoiceMap["zh-CN"]
	}
	voice, ok := voiceCfg[gender]
	if !ok {
		voice = voiceCfg["female"]
	}

	ssml := fmt.Sprintf(`<speak version='1.0' xml:lang='%s'>
		<voice name='%s'>
			<prosody rate='%s'>%s</prosody>
		</voice>
	</speak>`, locale, voice.VoiceName, voice.Rate, text)

	url := fmt.Sprintf("https://%s.tts.speech.microsoft.com/cognitiveservices/v1", e.region)
	req, err := http.NewRequest("POST", url, bytes.NewBufferString(ssml))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Ocp-Apim-Subscription-Key", e.key)
	req.Header.Set("Content-Type", "application/ssml+xml")
	req.Header.Set("X-Microsoft-OutputFormat", "audio-24khz-96kbitrate-mono-mp3")

	resp, err := e.httpCli.Do(req)
	if err != nil {
		return nil, fmt.Errorf("azure tts request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("azure tts error %d: %s", resp.StatusCode, string(body))
	}

	return io.ReadAll(resp.Body)
}
