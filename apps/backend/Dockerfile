FROM golang:1.26-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/server .
COPY --from=builder /app/migrations ./migrations

RUN chown -R appuser:appgroup /app

USER appuser

# Single source of truth untuk port listen: ENV SERVER_PORT (dibaca config.go).
# Build-time: ARG mengisi default & metadata EXPOSE. Runtime: override via
# environment compose/server — healthcheck shell-form mengikuti ENV otomatis.
ARG APP_PORT=8080
ENV SERVER_PORT=${APP_PORT}

EXPOSE ${APP_PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider "http://localhost:${SERVER_PORT}/api/v1/health" || exit 1

ENTRYPOINT ["./server"]
