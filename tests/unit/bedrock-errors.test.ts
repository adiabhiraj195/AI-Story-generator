import { describe, it, expect } from 'vitest';
import {
  parseBedrockError,
  formatBedrockErrorMessage,
  BedrockError,
} from '../../src/utils/errors.js';

describe('AWS Bedrock Error Handling', () => {
  const context = {
    modelId: 'amazon.nova-lite-v1:0',
    region: 'us-east-1',
    profile: 'bedrock-dev',
  };

  it('1. handles AccessDeniedException as non-retryable 403 error', () => {
    const rawError = {
      name: 'AccessDeniedException',
      message: 'User is not authorized to perform: bedrock:InvokeModel',
      $metadata: { httpStatusCode: 403 },
    };

    const err = parseBedrockError(rawError, context);
    expect(err).toBeInstanceOf(BedrockError);
    expect(err.awsErrorCode).toBe('AccessDeniedException');
    expect(err.statusCode).toBe(403);
    expect(err.isRetryable).toBe(false);
    expect(err.likelyCause).toContain('lacks permissions');
    expect(err.correctiveAction).toContain('Attach an IAM policy');
  });

  it('2. handles ValidationException with "Operation not allowed" explaining model access requirement', () => {
    const rawError = {
      name: 'ValidationException',
      message: 'Operation not allowed',
      $metadata: { httpStatusCode: 400 },
    };

    const err = parseBedrockError(rawError, context);
    expect(err).toBeInstanceOf(BedrockError);
    expect(err.awsErrorCode).toBe('ValidationException');
    expect(err.statusCode).toBe(400);
    expect(err.isRetryable).toBe(false);
    expect(err.likelyCause).toContain('Model access is not granted');
    expect(err.correctiveAction).toContain('Model access');
    expect(err.correctiveAction).toContain('console.aws.amazon.com/bedrock');
  });

  it('3. handles ResourceNotFoundException including deprecated EOL models', () => {
    const rawError = {
      name: 'ResourceNotFoundException',
      message: 'This model version has reached the end of its life. Please refer to the AWS documentation.',
      $metadata: { httpStatusCode: 404 },
    };

    const err = parseBedrockError(rawError, context);
    expect(err).toBeInstanceOf(BedrockError);
    expect(err.awsErrorCode).toBe('ResourceNotFoundException');
    expect(err.statusCode).toBe(404);
    expect(err.isRetryable).toBe(false);
    expect(err.likelyCause).toContain('reached End-Of-Life (EOL)');
    expect(err.correctiveAction).toContain('Update BEDROCK_MODEL_ID');
  });

  it('4. handles ThrottlingException as retryable 429 error', () => {
    const rawError = {
      name: 'ThrottlingException',
      message: 'Too many requests, please slow down.',
      $metadata: { httpStatusCode: 429 },
    };

    const err = parseBedrockError(rawError, context);
    expect(err).toBeInstanceOf(BedrockError);
    expect(err.awsErrorCode).toBe('ThrottlingException');
    expect(err.statusCode).toBe(429);
    expect(err.isRetryable).toBe(true);
    expect(err.likelyCause).toContain('limit exceeded');
    expect(err.correctiveAction).toContain('exponential backoff');
  });

  it('5. handles ModelTimeoutException as retryable 504 error', () => {
    const rawError = {
      name: 'ModelTimeoutException',
      message: 'Inference request timed out after 60000ms',
      $metadata: { httpStatusCode: 504 },
    };

    const err = parseBedrockError(rawError, context);
    expect(err).toBeInstanceOf(BedrockError);
    expect(err.awsErrorCode).toBe('ModelTimeoutException');
    expect(err.statusCode).toBe(504);
    expect(err.isRetryable).toBe(true);
    expect(err.likelyCause).toContain('timed out');
    expect(err.correctiveAction).toContain('maxTokens');
  });

  it('6. handles ServiceUnavailableException as retryable 503 error', () => {
    const rawError = {
      name: 'ServiceUnavailableException',
      message: 'Service is temporarily unavailable',
      $metadata: { httpStatusCode: 503 },
    };

    const err = parseBedrockError(rawError, context);
    expect(err).toBeInstanceOf(BedrockError);
    expect(err.awsErrorCode).toBe('ServiceUnavailableException');
    expect(err.statusCode).toBe(503);
    expect(err.isRetryable).toBe(true);
    expect(err.likelyCause).toContain('temporarily unavailable');
  });

  it('7. handles Invalid AWS Credentials / CredentialsProviderError as non-retryable 401 error', () => {
    const rawError = {
      name: 'CredentialsProviderError',
      message: 'Could not load credentials from any providers',
    };

    const err = parseBedrockError(rawError, context);
    expect(err).toBeInstanceOf(BedrockError);
    expect(err.awsErrorCode).toBe('InvalidCredentialsException');
    expect(err.statusCode).toBe(401);
    expect(err.isRetryable).toBe(false);
    expect(err.likelyCause).toContain('Failed to load valid AWS credentials');
    expect(err.correctiveAction).toContain('aws sts get-caller-identity');
  });

  it('8. formats Bedrock error message with clear cause, action, and retryability', () => {
    const err = new BedrockError('Test access failure', {
      awsErrorCode: 'AccessDeniedException',
      statusCode: 403,
      isRetryable: false,
      likelyCause: 'IAM policy missing',
      correctiveAction: 'Grant bedrock:InvokeModel',
      modelId: 'amazon.nova-lite-v1:0',
      region: 'us-east-1',
    });

    const formatted = formatBedrockErrorMessage(err);
    expect(formatted).toContain('AWS BEDROCK ERROR: [AccessDeniedException]');
    expect(formatted).toContain('amazon.nova-lite-v1:0');
    expect(formatted).toContain('Retryable:        NO (permanent configuration issue)');
    expect(formatted).toContain('Likely Cause:');
    expect(formatted).toContain('IAM policy missing');
    expect(formatted).toContain('Corrective Action:');
    expect(formatted).toContain('Grant bedrock:InvokeModel');
  });
});

