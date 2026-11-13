import { describe, it, expect } from 'vitest';
import {
  parseGroqError,
  formatGroqErrorMessage,
  GroqError,
  isGroqErrorLike,
} from '../../src/utils/errors.js';

describe('Groq LLM Error Handling', () => {
  const context = {
    modelId: 'llama-3.3-70b-versatile',
  };

  it('1. handles 401 AuthenticationError as non-retryable 401 error', () => {
    const rawError = {
      name: 'AuthenticationError',
      status: 401,
      message: 'Invalid API Key provided',
    };

    const err = parseGroqError(rawError, context);
    expect(err).toBeInstanceOf(GroqError);
    expect(err.errorCode).toBe('AuthenticationError');
    expect(err.statusCode).toBe(401);
    expect(err.isRetryable).toBe(false);
    expect(err.likelyCause).toContain('GROQ_API_KEY');
    expect(err.correctiveAction).toContain('console.groq.com/keys');
  });

  it('2. handles 429 RateLimitError as retryable 429 error', () => {
    const rawError = {
      name: 'RateLimitError',
      status: 429,
      message: 'Rate limit reached for model `llama-3.3-70b-versatile` in organization: Limit 6000 TPM.',
    };

    const err = parseGroqError(rawError, context);
    expect(err).toBeInstanceOf(GroqError);
    expect(err.errorCode).toBe('RateLimitError');
    expect(err.statusCode).toBe(429);
    expect(err.isRetryable).toBe(true);
    expect(err.likelyCause).toContain('quota exceeded');
    expect(err.correctiveAction).toContain('exponential backoff');
  });

  it('3. handles 404 NotFoundError as non-retryable 404 error', () => {
    const rawError = {
      name: 'NotFoundError',
      status: 404,
      message: 'The model `invalid-model-name` does not exist or you do not have access to it.',
    };

    const err = parseGroqError(rawError, context);
    expect(err).toBeInstanceOf(GroqError);
    expect(err.errorCode).toBe('NotFoundError');
    expect(err.statusCode).toBe(404);
    expect(err.isRetryable).toBe(false);
    expect(err.likelyCause).toContain('was not found');
    expect(err.correctiveAction).toContain('GROQ_MODEL');
  });

  it('4. handles 400 BadRequestError for context window overflow', () => {
    const rawError = {
      name: 'BadRequestError',
      status: 400,
      message: "This model's maximum context length is 8192 tokens. However, you requested 9000 tokens.",
    };

    const err = parseGroqError(rawError, context);
    expect(err).toBeInstanceOf(GroqError);
    expect(err.errorCode).toBe('BadRequestError');
    expect(err.statusCode).toBe(400);
    expect(err.isRetryable).toBe(false);
    expect(err.likelyCause).toContain('context window');
    expect(err.correctiveAction).toContain('context window');
  });

  it('5. handles 503 ServiceUnavailable as retryable error', () => {
    const rawError = {
      name: 'ServiceUnavailableError',
      status: 503,
      message: 'Groq inference servers are temporarily overloaded.',
    };

    const err = parseGroqError(rawError, context);
    expect(err).toBeInstanceOf(GroqError);
    expect(err.statusCode).toBe(503);
    expect(err.isRetryable).toBe(true);
    expect(err.likelyCause).toContain('temporarily overloaded');
    expect(err.correctiveAction).toContain('status.groq.com');
  });

  it('6. handles network/connection timeout errors as retryable', () => {
    const rawError = {
      name: 'APIConnectionTimeoutError',
      message: 'Request to api.groq.com timed out after 30000ms',
    };

    const err = parseGroqError(rawError, context);
    expect(err).toBeInstanceOf(GroqError);
    expect(err.isRetryable).toBe(true);
    expect(err.likelyCause).toContain('api.groq.com');
  });

  it('7. detects Groq error with isGroqErrorLike', () => {
    expect(isGroqErrorLike(new GroqError('test'))).toBe(true);
    expect(isGroqErrorLike({ name: 'RateLimitError' })).toBe(true);
    expect(isGroqErrorLike({ status: 429 })).toBe(true);
    expect(isGroqErrorLike({ message: 'invalid api key' })).toBe(true);
    expect(isGroqErrorLike(null)).toBe(false);
    expect(isGroqErrorLike('random string')).toBe(false);
  });

  it('8. formats Groq error message with clear details and action', () => {
    const err = new GroqError('Rate limit exceeded', {
      errorCode: 'RateLimitError',
      statusCode: 429,
      isRetryable: true,
      likelyCause: 'TPM limit exceeded',
      correctiveAction: 'Retry with exponential backoff',
      modelId: 'llama-3.3-70b-versatile',
    });

    const formatted = formatGroqErrorMessage(err);
    expect(formatted).toContain('GROQ LLM ERROR: [RateLimitError]');
    expect(formatted).toContain('llama-3.3-70b-versatile');
    expect(formatted).toContain('Retryable:        YES (temporary error)');
    expect(formatted).toContain('TPM limit exceeded');
    expect(formatted).toContain('Retry with exponential backoff');
  });
});
