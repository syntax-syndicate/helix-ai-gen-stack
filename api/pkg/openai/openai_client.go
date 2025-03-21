package openai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/avast/retry-go/v4"
	"github.com/helixml/helix/api/pkg/model"
	"github.com/rs/zerolog/log"
	openai "github.com/sashabaranov/go-openai"
)

const (
	retries             = 3
	delayBetweenRetries = time.Second

	embeddingRetries = 5
	embeddingDelay   = 3 * time.Second
)

//go:generate mockgen -source $GOFILE -destination openai_client_mocks.go -package $GOPACKAGE

type Client interface {
	CreateChatCompletion(ctx context.Context, request openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error)
	CreateChatCompletionStream(ctx context.Context, request openai.ChatCompletionRequest) (*openai.ChatCompletionStream, error)

	ListModels(ctx context.Context) ([]model.OpenAIModel, error)

	CreateEmbeddings(ctx context.Context, request openai.EmbeddingRequest) (resp openai.EmbeddingResponse, err error)

	APIKey() string
}

func New(apiKey string, baseURL string) *RetryableClient {
	config := openai.DefaultConfig(apiKey)
	config.BaseURL = baseURL
	config.HTTPClient = &openAIClientInterceptor{}

	client := openai.NewClientWithConfig(config)

	return &RetryableClient{
		apiClient:  client,
		httpClient: http.DefaultClient,
		baseURL:    baseURL,
		apiKey:     apiKey,
	}
}

type RetryableClient struct {
	apiClient *openai.Client

	httpClient *http.Client
	baseURL    string
	apiKey     string
}

// APIKey - returns the API key used by the client, used for testing
func (c *RetryableClient) APIKey() string {
	return c.apiKey
}

func (c *RetryableClient) CreateChatCompletion(ctx context.Context, request openai.ChatCompletionRequest) (resp openai.ChatCompletionResponse, err error) {
	// Perform request with retries
	err = retry.Do(func() error {
		resp, err = c.apiClient.CreateChatCompletion(ctx, request)
		if err != nil {
			if strings.Contains(err.Error(), "401 Unauthorized") || strings.Contains(err.Error(), "404") {
				return retry.Unrecoverable(err)
			}

			return err
		}

		return nil
	},
		retry.Attempts(retries),
		retry.Delay(delayBetweenRetries),
		retry.Context(ctx),
	)

	return
}

func (c *RetryableClient) CreateChatCompletionStream(ctx context.Context, request openai.ChatCompletionRequest) (*openai.ChatCompletionStream, error) {
	return c.apiClient.CreateChatCompletionStream(ctx, request)
}

// TODO: just use OpenAI client's ListModels function and separate this from TogetherAI
func (c *RetryableClient) ListModels(ctx context.Context) ([]model.OpenAIModel, error) {
	url := c.baseURL + "/models"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request to provider's models endpoint: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request to provider's models endpoint: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get models from provider: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response from provider's models endpoint: %w", err)
	}

	// Log the response body for debugging purposes
	log.Trace().Str("base_url", c.baseURL).Msg("Response from provider's models endpoint")
	log.Trace().RawJSON("response_body", body).Msg("Models response")

	var models []model.OpenAIModel
	var rawResponse struct {
		Data []model.OpenAIModel `json:"data"`
	}
	err = json.Unmarshal(body, &rawResponse)
	if err == nil && len(rawResponse.Data) > 0 {
		models = rawResponse.Data
	} else {
		// If unmarshaling into the struct with "data" field fails, try unmarshaling directly into the slice
		// This is how together.ai returns their models
		err = json.Unmarshal(body, &models)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal response from provider's models endpoint (%s): %w, %s", url, err, string(body))
		}
	}

	// Sort models: llama-33-70b-instruct models first, then other llama models, then meta-llama/* models, then the rest
	sort.Slice(models, func(i, j int) bool {
		// First priority: any XXX/llama-33-70b-instruct model
		iIsLlama33_70b := strings.Contains(strings.ToLower(models[i].ID), "llama-33-70b-instruct")
		jIsLlama33_70b := strings.Contains(strings.ToLower(models[j].ID), "llama-33-70b-instruct")

		if iIsLlama33_70b && !jIsLlama33_70b {
			return true
		}
		if !iIsLlama33_70b && jIsLlama33_70b {
			return false
		}

		// Second priority: Meta-Llama-3.1-8B-Instruct-Turbo
		if models[i].ID == "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo" {
			return true
		}
		if models[j].ID == "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo" {
			return false
		}

		// Third priority: Meta-Llama 3.1 models
		iIsMetaLlama31 := strings.HasPrefix(models[i].ID, "meta-llama/Meta-Llama-3.1")
		jIsMetaLlama31 := strings.HasPrefix(models[j].ID, "meta-llama/Meta-Llama-3.1")

		if iIsMetaLlama31 && !jIsMetaLlama31 {
			return true
		}
		if !iIsMetaLlama31 && jIsMetaLlama31 {
			return false
		}

		// Fourth priority: Other Meta-Llama models
		iIsMetaLlama := strings.HasPrefix(models[i].ID, "meta-llama/")
		jIsMetaLlama := strings.HasPrefix(models[j].ID, "meta-llama/")

		if iIsMetaLlama && !jIsMetaLlama {
			return true
		}
		if !iIsMetaLlama && jIsMetaLlama {
			return false
		}

		// Fifth priority: any llama prefix model
		iIsLlama := strings.Contains(strings.ToLower(models[i].ID), "llama")
		jIsLlama := strings.Contains(strings.ToLower(models[j].ID), "llama")

		if iIsLlama && !jIsLlama {
			return true
		}
		if !iIsLlama && jIsLlama {
			return false
		}

		// Finally: alphabetical order
		return models[i].ID < models[j].ID
	})

	// Hack to workaround that OpenAI returns models like dall-e-3, which we
	// can't send chat completion requests to. Use a rough heuristic to
	// filter out models we can't use.

	// Check if any model starts with "gpt-"
	hasGPTModel := false
	for _, m := range models {
		if strings.HasPrefix(m.ID, "gpt-") {
			hasGPTModel = true
			break
		}
	}

	// If there's a GPT model, filter out non-GPT models
	if hasGPTModel {
		filteredModels := make([]model.OpenAIModel, 0)
		for _, m := range models {
			if strings.HasPrefix(m.ID, "gpt-") {
				filteredModels = append(filteredModels, m)
			}
		}
		models = filteredModels
	}

	return models, nil
}

func (c *RetryableClient) CreateEmbeddings(ctx context.Context, request openai.EmbeddingRequest) (resp openai.EmbeddingResponse, err error) {
	// Perform request with retries
	err = retry.Do(func() error {
		resp, err = c.apiClient.CreateEmbeddings(ctx, request)
		if err != nil {
			if strings.Contains(err.Error(), "401 Unauthorized") {
				return retry.Unrecoverable(err)
			}
			return err
		}
		return nil
	},
		retry.Attempts(embeddingRetries),
		retry.Delay(embeddingDelay),
		retry.Context(ctx),
	)

	return
}

type openAIClientInterceptor struct {
	http.Client
}

// Do intercepts requests to the OpenAI API and modifies the body to be compatible with TogetherAI,
// or others
func (c *openAIClientInterceptor) Do(req *http.Request) (*http.Response, error) {
	if req.URL.Host == "api.together.xyz" && req.URL.Path == "/v1/embeddings" && req.Body != nil {
		// Parse the original embedding request body
		embeddingRequest := openai.EmbeddingRequest{}
		if err := json.NewDecoder(req.Body).Decode(&embeddingRequest); err != nil {
			return nil, fmt.Errorf("failed to decode embedding request body: %w", err)
		}
		req.Body.Close()

		// Create a new request with the modified body
		type togetherEmbeddingRequest struct {
			Model string `json:"model"`
			Input any    `json:"input"`
		}
		togetherRequest := togetherEmbeddingRequest{
			Model: string(embeddingRequest.Model),
			Input: embeddingRequest.Input,
		}

		newBytes, err := json.Marshal(togetherRequest)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal together embedding request: %w", err)
		}

		newReq, err := http.NewRequestWithContext(req.Context(), req.Method, req.URL.String(), bytes.NewBuffer(newBytes))
		if err != nil {
			return nil, fmt.Errorf("failed to create new request: %w", err)
		}
		newReq.Header = req.Header

		return c.Client.Do(newReq)
	}

	return c.Client.Do(req)
}
