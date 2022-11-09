package storage

import (
	"bytes"
	"context"
	"fmt"
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsCfg "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/navia-academy/backend/internal/config"
)

type StorageService struct {
	client   *s3.Client
	bucket   string
	publicURL string
}

func NewStorageService(cfg config.StorageConfig) *StorageService {
	if cfg.AccessKey == "" {
		log.Println("storage: no credentials configured, using local fallback")
		return &StorageService{bucket: cfg.Bucket, publicURL: cfg.PublicURL}
	}

	acfg, err := awsCfg.LoadDefaultConfig(context.Background(),
		awsCfg.WithRegion(cfg.Region),
		awsCfg.WithCredentialsProvider(aws.NewCredentialsCache(
			&credentials.StaticCredentialsProvider{
				Value: aws.Credentials{
					AccessKeyID:     cfg.AccessKey,
					SecretAccessKey: cfg.SecretKey,
				},
			},
		)),
	)
	if err != nil {
		log.Printf("storage: failed to load aws config: %v, using local fallback", err)
		return &StorageService{bucket: cfg.Bucket, publicURL: cfg.PublicURL}
	}

	client := s3.NewFromConfig(acfg, func(o *s3.Options) {
		if cfg.Endpoint != "" {
			o.BaseEndpoint = aws.String(cfg.Endpoint)
		}
		o.UsePathStyle = true
	})

	return &StorageService{
		client:    client,
		bucket:    cfg.Bucket,
		publicURL: cfg.PublicURL,
	}
}

func (s *StorageService) Upload(ctx context.Context, key string, data []byte, contentType string) (string, error) {
	if s.client == nil {
		publicURL := s.publicURL
		if publicURL == "" {
			publicURL = "http://localhost:8080"
		}
		return fmt.Sprintf("%s/%s", publicURL, key), nil
	}

	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:       aws.String(s.bucket),
		Key:          aws.String(key),
		Body:         bytes.NewReader(data),
		ContentType:  aws.String(contentType),
		CacheControl: aws.String("public, max-age=31536000, immutable"),
	})
	if err != nil {
		return "", fmt.Errorf("s3 upload: %w", err)
	}

	publicURL := s.publicURL
	if publicURL == "" {
		publicURL = fmt.Sprintf("https://%s.s3.%s.amazonaws.com", s.bucket, s.client.Options().Region)
	}

	return fmt.Sprintf("%s/%s", publicURL, key), nil
}

func (s *StorageService) IsConfigured() bool {
	return s.client != nil
}
