package main

import (
	"context"
	"errors"
	"log"
	"os"
	"os/signal"
	"runtime/debug"
	"strconv"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/requestid"
	"github.com/joho/godotenv"
	// Auto-detects the cgroup CPU quota and sets runtime.GOMAXPROCS at init,
	// so the scheduler matches the container's CPU limit instead of the
	// host's core count (logs its detected value via the std log package).
	_ "go.uber.org/automaxprocs"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/navia-academy/backend/internal/config"
	"github.com/navia-academy/backend/internal/database"
	"github.com/navia-academy/backend/internal/handler"
	"github.com/navia-academy/backend/internal/middleware"
	"github.com/navia-academy/backend/internal/repository"
	"github.com/navia-academy/backend/internal/service"
	"github.com/navia-academy/backend/pkg/jwt"
	"github.com/navia-academy/backend/pkg/response"
	"github.com/navia-academy/backend/pkg/storage"

	_ "github.com/navia-academy/backend/cmd/server/docs"
	fiberSwagger "github.com/swaggo/fiber-swagger"
)

// memSoftLimitFraction places the Go GC soft limit (GOMEMLIMIT) at this share
// of the container's hard Docker memory cap (API_MEM_LIMIT_BYTES), so the GC
// starts freeing memory with margin before the kernel OOM-killer would act.
const memSoftLimitFraction = 0.9

// contentLevelsRefreshInterval: how often the published content-levels
// whitelist is refetched from the CDN. Levels change rarely — a few times a
// day is generous; tune here if needed.
const (
	contentLevelsRefreshInterval = 6 * time.Hour
	contentLevelsFetchTimeout    = 5 * time.Second
)

// startContentLevelsSync fetches the published whitelist once at startup
// (bounded, non-fatal: failure falls back to the embedded last-known-good
// copy with a loud log), then refreshes periodically so a running server
// picks up newly published levels without a restart.
func startContentLevelsSync(cfg *config.Config, logger *zap.Logger) {
	if cfg.ContentLevelsURL == "" {
		logger.Warn("CONTENT_LEVELS_URL not configured — review level whitelist uses embedded fallback only")
		return
	}
	url := cfg.ContentLevelsURL

	fetchOnce := func(stage string) {
		ctx, cancel := context.WithTimeout(context.Background(), contentLevelsFetchTimeout)
		defer cancel()
		if err := service.FetchContentLevels(ctx, url); err != nil {
			logger.Warn("content-levels CDN fetch failed; keeping current whitelist",
				zap.String("stage", stage), zap.String("url", url), zap.Error(err))
			return
		}
		logger.Info("content-levels whitelist loaded from CDN", zap.String("stage", stage), zap.String("url", url))
	}

	go func() {
		fetchOnce("startup")
		ticker := time.NewTicker(contentLevelsRefreshInterval)
		defer ticker.Stop()
		for range ticker.C {
			fetchOnce("refresh")
		}
	}()
}

// setMemoryLimit applies a soft GOMEMLIMIT derived from the container's hard
// memory cap. Fails open: when API_MEM_LIMIT_BYTES is absent or invalid
// (e.g. local `go run` outside Docker) Go keeps its default, unlimited.
func setMemoryLimit(logger *zap.Logger) {
	limitStr := os.Getenv("API_MEM_LIMIT_BYTES")
	if limitStr == "" {
		return
	}
	hardBytes, err := strconv.ParseInt(limitStr, 10, 64)
	if err != nil || hardBytes <= 0 {
		logger.Warn("ignoring invalid API_MEM_LIMIT_BYTES; no soft memory limit set",
			zap.String("value", limitStr))
		return
	}
	soft := int64(float64(hardBytes) * memSoftLimitFraction)
	debug.SetMemoryLimit(soft)
	logger.Info("go runtime soft memory limit set",
		zap.Int64("hard_limit_bytes", hardBytes),
		zap.Int64("soft_limit_bytes", soft))
}

// newLogger builds the production zap logger, honoring the configured
// LOG_LEVEL. Falls back to info when the value is unparsable.
func newLogger(level string) (*zap.Logger, error) {
	cfg := zap.NewProductionConfig()
	var lvl zapcore.Level
	if err := lvl.UnmarshalText([]byte(level)); err != nil {
		lvl = zapcore.InfoLevel
	}
	cfg.Level = zap.NewAtomicLevelAt(lvl)
	return cfg.Build()
}

// @title           Navia Academy API
// @version         1.0.0
// @description     Mandarin Chinese Learning Platform REST API
// @termsOfService  https://navia.academy/terms

// @contact.name   Navia Academy Support
// @contact.email  support@navia.academy

// @license.name  MIT
// @license.url   https://opensource.org/licenses/MIT

// @host      localhost:8080
// @BasePath  /api/v1

// @securityDefinitions.apikey  BearerAuth
// @in                          header
// @name                        Authorization
// @description                Type "Bearer" followed by a space and the access token.

// @securityDefinitions.apikey  ServiceTokenAuth
// @in                          header
// @name                        Authorization
// @description                Type "Bearer" followed by a space and the shared CONTENT_EXPORT_TOKEN. Machine-to-machine export auth, not a user session.

// @externalDocs.description  OpenAPI Specification
// @externalDocs.url          https://swagger.io/specification/
func main() {
	godotenv.Load()

	cfg := config.Load()

	logger, err := newLogger(cfg.App.LogLevel)
	if err != nil {
		log.Fatalf("failed to initialize logger: %v", err)
	}
	defer logger.Sync()
	zap.ReplaceGlobals(logger)

	startContentLevelsSync(cfg, logger)

	setMemoryLimit(logger)

	pgPool, err := database.NewPostgresPool(cfg.Database)
	if err != nil {
		logger.Fatal("database connection failed", zap.Error(err))
	}
	logger.Info("connected to postgresql")

	redisCli, err := database.NewRedisClient(cfg.Redis)
	if err != nil {
		logger.Warn("redis not available, rate limiting disabled", zap.Error(err))
		redisCli = nil
	} else {
		logger.Info("connected to redis")
	}

	jwtSvc := jwt.New(cfg.JWT.AccessSecret, cfg.JWT.RefreshSecret,
		cfg.JWT.AccessDuration, cfg.JWT.RefreshDuration, cfg.JWT.Issuer)

	store := storage.NewStorageService(cfg.Storage)

	userRepo := repository.NewUserRepository(pgPool)
	progressRepo := repository.NewProgressRepository(pgPool)
	taskRepo := repository.NewTaskRepository(pgPool)
	gameRepo := repository.NewGameRepository(pgPool)
	achievementRepo := repository.NewAchievementRepository(pgPool)
	settingsRepo := repository.NewSettingsRepository(pgPool)
	examRepo := repository.NewExamRepository(pgPool)
	srsRepo := repository.NewSRSRepository(pgPool)
	contributorRepo := repository.NewContributorRepository(pgPool)
	testimonialRepo := repository.NewTestimonialRepository(pgPool)
	supporterRepo := repository.NewSupporterRepository(pgPool)
	audioRepo := repository.NewAudioRepository(pgPool)
	contentRepo := repository.NewContentRepository(pgPool)

	srsSvc := service.NewSRSService()
	ttsSvc := service.NewTTSService(cfg.TTS, store, audioRepo)
	authSvc := service.NewAuthService(userRepo, jwtSvc)
	progressSvc := service.NewProgressService(progressRepo)
	taskSvc := service.NewTaskService(taskRepo)
	gameSvc := service.NewGameService(gameRepo)
	achievementSvc := service.NewAchievementService(achievementRepo)
	srsReviewSvc := service.NewSRSReviewService(srsRepo, srsSvc)
	settingsSvc := service.NewSettingsService(settingsRepo)
	examSvc := service.NewExamService(examRepo)
	contributorSvc := service.NewContributorService(contributorRepo)
	testimonialSvc := service.NewTestimonialService(testimonialRepo)
	supporterSvc := service.NewSupporterService(supporterRepo)
	contentSvc := service.NewContentService(contentRepo)

	authHandler := handler.NewAuthHandler(authSvc).
		WithGoogle(cfg.Google, cfg.App.SiteURL).
		WithResetTokenExposure(os.Getenv("RESET_TOKEN_EXPOSE") == "true")
	progressHandler := handler.NewProgressHandler(progressSvc)
	taskHandler := handler.NewTaskHandler(taskSvc)
	gameHandler := handler.NewGameHandler(gameSvc)
	achievementHandler := handler.NewAchievementHandler(achievementSvc)
	srsHandler := handler.NewSRSHandler(srsReviewSvc)
	settingsHandler := handler.NewSettingsHandler(settingsSvc)
	examHandler := handler.NewExamHandler(examSvc)
	ttsHandler := handler.NewTTSHandler(ttsSvc, audioRepo)
	contributorHandler := handler.NewContributorHandler(contributorSvc)
	testimonialHandler := handler.NewTestimonialHandler(testimonialSvc)
	supporterHandler := handler.NewSupporterHandler(supporterSvc, cfg.Webhook, cfg.App.SiteURL)
	contentHandler := handler.NewContentHandler(contentSvc)
	adminHandler := handler.NewAdminHandler(userRepo)

	app := fiber.New(fiber.Config{
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		// Trust X-Forwarded-For only when running behind a reverse proxy;
		// empty (default) uses the TCP peer address. Set TRUST_PROXY_HEADER
		// to the header your proxy sets (e.g. X-Forwarded-For) — never
		// enable it on a direct-exposed port (IP spoofing bypasses limits).
		ProxyHeader: os.Getenv("TRUST_PROXY_HEADER"),
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			// Pool exhaustion surfaces as a context deadline from the DB pool
			// wrapper: answer 503 so clients know to retry, not an opaque 500.
			if errors.Is(err, context.DeadlineExceeded) {
				return response.Error(c, fiber.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "service temporarily busy, please try again later")
			}
			// Fiber errors carry an explicit status + client-safe message.
			var fe *fiber.Error
			if errors.As(err, &fe) {
				return response.Error(c, fe.Code, "ERROR", fe.Message)
			}
			// Anything else: never leak internal details to the client.
			// request_id matches the trace_id in the response envelope.
			requestID, _ := c.Locals("requestid").(string)
			logger.Error("unhandled error",
				zap.String("path", c.Path()),
				zap.String("method", c.Method()),
				zap.String("request_id", requestID),
				zap.Error(err),
			)
			return response.Error(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", "an unexpected error occurred")
		},
	})

	// Liveness/health probes run OUTSIDE the global rate limiter so an
	// overloaded instance still answers orchestrator/load-balancer checks.
	app.Get("/api/v1/health", func(c *fiber.Ctx) error {
		return response.JSON(c, fiber.StatusOK, fiber.Map{
			"status":  "ok",
			"version": "1.0.0",
		})
	})

	app.Use(middleware.RecoveryMiddleware(logger))
	app.Use(requestid.New())
	app.Use(middleware.LoggerMiddleware(logger))
	app.Use(middleware.CORSMiddleware(cfg.App.CORSOrigins))
	app.Use(middleware.RateLimitMiddleware(redisCli, "global", cfg.App.RateLimitPerMin))
	app.Use(func(c *fiber.Ctx) error {
		c.Set("X-API-Version", "1.0.0")
		c.Set("X-Frame-Options", "DENY")
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-XSS-Protection", "1; mode=block")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		return c.Next()
	})

	api := app.Group("/api/v1")

	authMW := middleware.AuthMiddleware(jwtSvc)

	// Stricter limit for credential-based endpoints (brute-force surface):
	// login/register/refresh share one bucket per identifier (IP or user).
	authLimiter := middleware.RateLimitMiddleware(redisCli, "auth", 10)
	auth := api.Group("/auth")
	auth.Post("/register", authLimiter, authHandler.Register)
	auth.Post("/login", authLimiter, authHandler.Login)
	auth.Post("/refresh", authLimiter, authHandler.RefreshToken)
	auth.Get("/google", authHandler.GoogleAuthorize)
	auth.Post("/reset-password", authLimiter, authHandler.ResetPassword)
	auth.Post("/reset-password/confirm", authLimiter, authHandler.ResetPasswordConfirm)
	auth.Post("/logout", authMW, authHandler.Logout)
	auth.Post("/change-password", authMW, authHandler.ChangePassword)

	protected := api.Group("")

	protected.Get("/me", authMW, authHandler.Me)

	protected.Get("/progress", authMW, progressHandler.GetProgress)
	protected.Put("/progress", authMW, progressHandler.UpdateProgress)
	protected.Get("/progress/due-cards", authMW, srsHandler.GetDueCards)
	protected.Post("/progress/review", authMW, srsHandler.ReviewCard)
	protected.Get("/progress/achievements", authMW, achievementHandler.GetAchievements)
	protected.Post("/progress/study-session", authMW, progressHandler.LogStudySession)
	protected.Get("/progress/study-sessions", authMW, progressHandler.GetStudySessions)

	protected.Get("/tasks", authMW, taskHandler.GetTasks)
	protected.Post("/tasks", authMW, taskHandler.CreateTask)
	protected.Put("/tasks/:id", authMW, taskHandler.UpdateTask)
	protected.Delete("/tasks/:id", authMW, taskHandler.DeleteTask)

	protected.Post("/games", authMW, gameHandler.AddGameResult)

	protected.Get("/settings", authMW, settingsHandler.GetSettings)
	protected.Put("/settings", authMW, settingsHandler.UpdateSettings)

	protected.Get("/exam/sessions", authMW, examHandler.GetSessions)
	protected.Post("/exam/sessions", authMW, examHandler.CreateSession)
	protected.Put("/exam/sessions", authMW, examHandler.UpdateSession)
	protected.Post("/cat/result", authMW, middleware.RateLimitMiddleware(redisCli, "cat:result", 5), examHandler.SaveCatResult)
	protected.Get("/cat/progress", authMW, examHandler.GetCatProgress)
	protected.Post("/cat/session", authMW, middleware.RateLimitMiddleware(redisCli, "cat:session:create", 5), examHandler.CreateCatSession)
	protected.Patch("/cat/session/:id", authMW, middleware.RateLimitMiddleware(redisCli, "cat:session:patch", 60), examHandler.PatchCatSession)
	protected.Get("/cat/session/:id", authMW, examHandler.GetCatSession)

	api.Post("/tts", middleware.OptionalAuthMiddleware(jwtSvc), middleware.RateLimitMiddleware(redisCli, "tts", 10), ttsHandler.Synthesize)
	protected.Get("/tts/cache/stats", authMW, ttsHandler.GetCacheStats)
	protected.Get("/tts/metrics", authMW, ttsHandler.GetMetrics)

	api.Get("/contributors", contributorHandler.GetContributors)
	api.Get("/contributors/:id", contributorHandler.GetContributor)
	protected.Put("/contributors/:id", authMW, middleware.AdminMiddleware(), contributorHandler.UpdateContributor)
	protected.Delete("/contributors/:id", authMW, middleware.AdminMiddleware(), contributorHandler.DeleteContributor)

	api.Post("/contributors/apply", contributorHandler.ApplyContributor)
	protected.Get("/contributors/applications", authMW, middleware.AdminMiddleware(), contributorHandler.GetContributorApplications)
	protected.Put("/contributors/applications/:id/review", authMW, middleware.AdminMiddleware(), contributorHandler.ReviewApplication)

	api.Get("/testimonials", testimonialHandler.GetTestimonials)
	api.Post("/testimonials", middleware.RateLimitMiddleware(redisCli, "testimonials:submit", 5), testimonialHandler.SubmitTestimonial)
	protected.Get("/testimonials/admin", authMW, middleware.AdminMiddleware(), testimonialHandler.ListTestimonials)
	protected.Put("/testimonials/:id/status", authMW, middleware.AdminMiddleware(), testimonialHandler.ReviewTestimonial)
	protected.Delete("/testimonials/:id", authMW, middleware.AdminMiddleware(), testimonialHandler.DeleteTestimonial)

	api.Get("/sponsors", contributorHandler.GetSponsors)
	api.Get("/sponsors/:id", contributorHandler.GetSponsor)
	protected.Post("/sponsors", authMW, middleware.AdminMiddleware(), contributorHandler.CreateSponsor)
	protected.Put("/sponsors/:id", authMW, middleware.AdminMiddleware(), contributorHandler.UpdateSponsor)
	protected.Delete("/sponsors/:id", authMW, middleware.AdminMiddleware(), contributorHandler.DeleteSponsor)
	api.Post("/sponsors/apply", contributorHandler.ApplySponsor)
	protected.Get("/sponsors/applications", authMW, middleware.AdminMiddleware(), contributorHandler.GetSponsorApplications)

	// Supporters (donation wall) + donation webhooks.
	api.Get("/supporters", supporterHandler.GetSupporters)
	api.Post("/webhooks/kofi", supporterHandler.KofiWebhook)
	api.Post("/webhooks/trakteer", supporterHandler.TrakteerWebhook)
	protected.Get("/admin/support/config", authMW, middleware.AdminMiddleware(), supporterHandler.GetWebhookConfig)
	protected.Get("/admin/supporters", authMW, middleware.AdminMiddleware(), supporterHandler.ListAllSupporters)
	protected.Put("/admin/users/:id/role", authMW, middleware.AdminMiddleware(), adminHandler.SetUserRole)
	protected.Post("/admin/users", authMW, middleware.AdminMiddleware(), authHandler.CreateUser)
	protected.Get("/admin/users", authMW, middleware.AdminMiddleware(), adminHandler.ListUsers)

	// Content export bridge: read-only published-content feed consumed by
	// apps/media's sync script. Machine-to-machine (shared CONTENT_EXPORT_TOKEN
	// via ServiceTokenMiddleware) — deliberately OUTSIDE the JWT protected group,
	// no Redis rate limit (single known caller, low frequency).
	api.Get("/content/export", middleware.ServiceTokenMiddleware(cfg.ContentExportToken), contentHandler.Export)

	// Content store (write path): contributors edit, reviewers publish.
	protected.Get("/content", authMW, middleware.RoleMiddleware("contributor", "reviewer", "admin"), contentHandler.List)
	protected.Post("/content", authMW, middleware.RoleMiddleware("contributor", "reviewer", "admin"), contentHandler.Create)
	protected.Get("/content/:lang/:domain/:id", authMW, middleware.RoleMiddleware("contributor", "reviewer", "admin"), contentHandler.Get)
	protected.Put("/content/:lang/:domain/:id", authMW, middleware.RoleMiddleware("contributor", "reviewer", "admin"), contentHandler.Update)
	protected.Post("/content/:lang/:domain/:id/review", authMW, middleware.RoleMiddleware("reviewer", "admin"), contentHandler.Review)
	// @Summary Create SRS card for new item
	// @Description Create an SRS card for a new item (idempotent, ON CONFLICT DO NOTHING).
	// @Tags SRS
	// @Accept json
	// @Produce json
	// @Security BearerAuth
	// @Param body body object true "Payload: {\"item_id\":\"zh-vocab-hsk1-001\",\"kind\":\"word\"}" example({"item_id":"zh-vocab-hsk1-001","kind":"word"})
	// @Success 201 {object} response.APIResponse{data=models.SrsCard}
	// @Failure 400 {object} response.APIError "INVALID_BODY"
	// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
	// @Failure 500 {object} response.APIError "CREATE_FAILED"
	// @Router /srs/cards [post]
	protected.Post("/srs/cards", authMW, srsHandler.CreateCard)
	// @Summary Get SRS stats
	// @Description Get the user's SRS card statistics (total, due, new, learning, review per kind).
	// @Tags SRS
	// @Produce json
	// @Security BearerAuth
	// @Success 200 {object} response.APIResponse{data=object}
	// @Failure 401 {object} response.APIError "UNAUTHORIZED / TOKEN_EXPIRED"
	// @Router /srs/stats [get]
	protected.Get("/srs/stats", authMW, srsHandler.GetStats)

	app.Get("/", func(c *fiber.Ctx) error {
		return response.JSON(c, fiber.StatusOK, fiber.Map{
			"name":        "Navia Academy API",
			"version":     "1.0.0",
			"description": "Mandarin Chinese Learning Platform API",
			"docs":        "/docs",
		})
	})

	app.Get("/docs/*", fiberSwagger.WrapHandler)

	app.Get("/scalar", func(c *fiber.Ctx) error {
		c.Type("html")
		return c.SendString(`<!doctype html>
<html>
<head>
<title>Navia Academy API Reference</title>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
<script id="api-reference" data-url="/docs/doc.json"></script>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`)
	})

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		addr := ":" + cfg.Server.Port
		logger.Info("server starting", zap.String("addr", addr))
		if err := app.Listen(addr); err != nil {
			logger.Fatal("server error", zap.Error(err))
		}
	}()

	<-quit
	logger.Info("shutting down server...")
	// Bound the graceful shutdown so a stuck connection can't hang the
	// container forever past the drain window.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()
	if err := app.ShutdownWithContext(shutdownCtx); err != nil {
		logger.Warn("graceful shutdown did not complete in time", zap.Error(err))
	}
}
