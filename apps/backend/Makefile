.PHONY: dev build clean swagger docker-up docker-down

# Generate swagger docs
swagger:
	@SWAG_BIN="$(shell if command -v swag >/dev/null 2>&1; then echo swag; else echo $(shell go env GOPATH)/bin/swag; fi)"; \
	if [ -x "$$SWAG_BIN" ] || command -v "$$SWAG_BIN" >/dev/null 2>&1; then \
		echo "Generating Swagger docs..."; \
		$$SWAG_BIN init -g cmd/server/main.go -o cmd/server/docs --parseDependency --parseInternal; \
		echo "Swagger docs generated."; \
	else \
		echo "swag not installed. Install with: go install github.com/swaggo/swag/cmd/swag@latest"; \
		exit 1; \
	fi

# Build the server binary
build:
	@echo "Building server..."
	@go build -o bin/server ./cmd/server
	@echo "Build complete: bin/server"

# Run in development mode (hot-reload via Air; falls back to plain `go run`)
dev:
	@AIR_BIN="$(shell if command -v air >/dev/null 2>&1; then echo air; else echo $(shell go env GOPATH)/bin/air; fi)"; \
	if [ -x "$$AIR_BIN" ] || command -v "$$AIR_BIN" >/dev/null 2>&1; then \
		echo "Starting server with Air hot-reload ($$AIR_BIN)..."; \
		$$AIR_BIN -c .air.toml; \
	else \
		echo "Air not found, falling back to 'go run' (no hot reload)"; \
		go run ./cmd/server; \
	fi

# Clean build artifacts
clean:
	@rm -rf bin/

# Docker
docker-up:
	@docker compose up -d

docker-down:
	@docker compose down

# Recompute container resource caps from this host's actual vCPU/RAM into .env.
# Run once on a fresh VPS and after any VPS plan change, before `docker compose up`.
resource-limits:
	@bash scripts/compute-resource-limits.sh

resource-limits-dry:
	@bash scripts/compute-resource-limits.sh --dry-run
