package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Server             ServerConfig
	Database           DatabaseConfig
	Redis              RedisConfig
	JWT                JWTConfig
	Audio              AudioConfig
	TTS                TTSConfig
	Storage            StorageConfig
	SMTP               SMTPConfig
	App                AppConfig
	Google             GoogleConfig
	Webhook            WebhookConfig
	ContentExportToken string
	ContentLevelsURL   string
}

type ServerConfig struct {
	Port            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	ShutdownTimeout time.Duration
}

type DatabaseConfig struct {
	URL                    string
	MaxOpenConns           int
	MaxIdleConns           int
	ConnMaxLifetimeMinutes int
}

type RedisConfig struct {
	URL      string
	Password string
}

type JWTConfig struct {
	AccessSecret     string
	RefreshSecret    string
	AccessDuration   time.Duration
	RefreshDuration  time.Duration
	Issuer           string
}

type AudioConfig struct {
	BaseURL     string
	MaxFileSize int64
}

type TTSConfig struct {
	Engine        string
	GoogleKey     string
	AzureKey      string
	AzureRegion   string
	DefaultLocale string
	DefaultGender string
}

type StorageConfig struct {
	Provider  string
	Bucket    string
	Region    string
	Endpoint  string
	AccessKey string
	SecretKey string
	PublicURL string
}

type SMTPConfig struct {
	Host string
	Port int
	User string
	Pass string
	From string
}

type AppConfig struct {
	SiteURL         string
	CORSOrigins     string
	RateLimitPerMin int
	LogLevel        string
}
type WebhookConfig struct {
	KofiVerificationToken string
	TrakteerWebhookSecret string
}

type GoogleConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port:            getEnv("SERVER_PORT", "8080"),
			ReadTimeout:     getDuration("SERVER_READ_TIMEOUT", 10*time.Second),
			WriteTimeout:    getDuration("SERVER_WRITE_TIMEOUT", 30*time.Second),
			ShutdownTimeout: getDuration("SERVER_SHUTDOWN_TIMEOUT", 15*time.Second),
		},
		Database: DatabaseConfig{
			URL:                    getEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/navia"),
			MaxOpenConns:           getInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:           getInt("DB_MAX_IDLE_CONNS", 10),
			ConnMaxLifetimeMinutes: getInt("DB_CONN_MAX_LIFETIME_MIN", 30),
		},
		Redis: RedisConfig{
			URL:      getEnv("REDIS_URL", "redis://localhost:6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
		},
		JWT: JWTConfig{
			AccessSecret:    getEnv("JWT_ACCESS_SECRET", "change-me-access-secret-32-chars!"),
			RefreshSecret:   getEnv("JWT_REFRESH_SECRET", "change-me-refresh-secret-32-chars!"),
			AccessDuration:  getDuration("JWT_ACCESS_DURATION", 15*time.Minute),
			RefreshDuration: getDuration("JWT_REFRESH_DURATION", 7*24*time.Hour),
			Issuer:          getEnv("JWT_ISSUER", "navia-academy"),
		},
		Audio: AudioConfig{
			BaseURL:     getEnv("AUDIO_BASE_URL", "/audio"),
			MaxFileSize: int64(getInt("AUDIO_MAX_FILE_SIZE_MB", 5) * 1024 * 1024),
		},
		TTS: TTSConfig{
			Engine:        getEnv("TTS_ENGINE", "edge"),
			GoogleKey:     getEnv("GOOGLE_TTS_API_KEY", ""),
			AzureKey:      getEnv("AZURE_SPEECH_KEY", ""),
			AzureRegion:   getEnv("AZURE_SPEECH_REGION", "eastasia"),
			DefaultLocale: getEnv("TTS_DEFAULT_LOCALE", "zh-CN"),
			DefaultGender: getEnv("TTS_DEFAULT_GENDER", "female"),
		},
		Storage: StorageConfig{
			Provider:  getEnv("STORAGE_PROVIDER", "s3"),
			Bucket:    getEnv("STORAGE_BUCKET", "navia-data"),
			Region:    getEnv("STORAGE_REGION", "auto"),
			Endpoint:  getEnv("STORAGE_ENDPOINT", ""),
			AccessKey: getEnv("STORAGE_ACCESS_KEY", ""),
			SecretKey: getEnv("STORAGE_SECRET_KEY", ""),
			PublicURL: getEnv("STORAGE_PUBLIC_URL", ""),
		},
		SMTP: SMTPConfig{
			Host: getEnv("SMTP_HOST", "smtp.gmail.com"),
			Port: getInt("SMTP_PORT", 587),
			User: getEnv("SMTP_USER", ""),
			Pass: getEnv("SMTP_PASS", ""),
			From: getEnv("SMTP_FROM", "noreply@navia.academy"),
		},
	App: AppConfig{
		SiteURL:         getEnv("SITE_URL", "http://localhost:3000"),
		CORSOrigins:     getEnv("CORS_ORIGINS", "http://localhost:3000"),
		RateLimitPerMin: getInt("RATE_LIMIT_PER_MIN", 60),
		LogLevel:        getEnv("LOG_LEVEL", "info"),
	},
		Google: GoogleConfig{
			ClientID:     getEnv("AUTH_GOOGLE_ID", ""),
			ClientSecret: getEnv("AUTH_GOOGLE_SECRET", ""),
			RedirectURL:  getEnv("AUTH_GOOGLE_REDIRECT_URL", ""),
		},
		Webhook: WebhookConfig{
			KofiVerificationToken: getEnv("KOFI_VERIFICATION_TOKEN", ""),
			TrakteerWebhookSecret: getEnv("TRAKTEER_WEBHOOK_SECRET", ""),
		},
		ContentExportToken: getEnv("CONTENT_EXPORT_TOKEN", ""),
		ContentLevelsURL:   getContentLevelsURL(),
	}
}

// getContentLevelsURL resolves where the published content-levels whitelist
// lives. Precedence: explicit CONTENT_LEVELS_URL > derived from the existing
// STORAGE_PUBLIC_URL base (same bucket/pattern apps/media publishes to) >
// empty (backend then boots on the embedded fallback only).
func getContentLevelsURL() string {
	if v := os.Getenv("CONTENT_LEVELS_URL"); v != "" {
		return v
	}
	if pub := getEnv("STORAGE_PUBLIC_URL", ""); pub != "" {
		return strings.TrimRight(pub, "/") + "/data/content-levels.json"
	}
	return ""
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

func getDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}
