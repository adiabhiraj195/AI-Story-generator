// ---------------------------------------------------------------------------
// Base application error
// ---------------------------------------------------------------------------

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ---------------------------------------------------------------------------
// Specialised errors
// ---------------------------------------------------------------------------

export class ValidationError extends AppError {
  constructor(message: string, public readonly details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string) {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export interface GroqErrorDetails {
  errorCode?: string | undefined;
  statusCode?: number | undefined;
  isRetryable?: boolean | undefined;
  likelyCause?: string | undefined;
  correctiveAction?: string | undefined;
  modelId?: string | undefined;
}

export class GroqError extends AppError {
  public readonly errorCode: string | undefined;
  public readonly isRetryable: boolean;
  public readonly likelyCause: string;
  public readonly correctiveAction: string;
  public readonly modelId: string | undefined;

  constructor(
    message: string,
    details?: Partial<GroqErrorDetails>,
    override readonly cause?: unknown,
  ) {
    super(message, details?.statusCode ?? 502, details?.errorCode ?? 'GROQ_ERROR');
    this.errorCode = details?.errorCode;
    this.isRetryable = details?.isRetryable ?? false;
    this.likelyCause = details?.likelyCause ?? 'Unknown Groq LLM error occurred';
    this.correctiveAction =
      details?.correctiveAction ?? 'Verify GROQ_API_KEY and model configuration in .env.';
    this.modelId = details?.modelId;
  }
}

// Backward-compatibility alias
export type BedrockErrorDetails = GroqErrorDetails & {
  awsErrorCode?: string | undefined;
  region?: string | undefined;
};

export class BedrockError extends GroqError {
  public readonly awsErrorCode: string | undefined;
  public readonly region: string | undefined;

  constructor(
    message: string,
    details?: Partial<BedrockErrorDetails>,
    override readonly cause?: unknown,
  ) {
    super(
      message,
      {
        ...details,
        errorCode: details?.awsErrorCode ?? details?.errorCode ?? 'BEDROCK_ERROR',
      },
      cause,
    );
    this.awsErrorCode = details?.awsErrorCode ?? details?.errorCode;
    this.region = details?.region;
  }
}

export class WorkflowError extends AppError {
  public readonly stage?: string | undefined;

  constructor(message: string, stage?: string, override readonly cause?: unknown) {
    super(message, 500, 'WORKFLOW_ERROR');
    this.stage = stage;
  }
}

// ---------------------------------------------------------------------------
// Groq error parser & formatter
// ---------------------------------------------------------------------------

export function isGroqErrorLike(err: unknown): boolean {
  if (err instanceof GroqError) return true;
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  const name = String(e['name'] ?? '');
  const code = String(e['code'] ?? '');
  const msg = String(e['message'] ?? '').toLowerCase();

  return (
    name.includes('Groq') ||
    name.includes('RateLimit') ||
    name.includes('AuthenticationError') ||
    name.includes('BadRequestError') ||
    name.includes('NotFoundError') ||
    name.includes('APIConnection') ||
    name.includes('APIError') ||
    code.includes('groq') ||
    code.includes('rate_limit') ||
    msg.includes('groq') ||
    msg.includes('rate limit') ||
    msg.includes('api key') ||
    Boolean(e['status'])
  );
}

/**
 * Parses Groq SDK and HTTP errors into rich, actionable GroqError instances.
 * Accurately categorises permanent errors (no retry) vs transient errors (retryable).
 */
export function parseGroqError(
  err: unknown,
  context?: { modelId?: string },
): GroqError {
  if (err instanceof GroqError) {
    return err;
  }

  const e = (err && typeof err === 'object' ? err : {}) as Record<string, unknown>;
  const name = String(e['name'] ?? e['code'] ?? '');
  const rawMessage = String(e['message'] ?? (err instanceof Error ? err.message : String(err)));
  const status = typeof e['status'] === 'number' ? e['status'] : undefined;

  const modelId = context?.modelId ?? 'configured model';

  // 1. Authentication Error (401 - Permanent)
  if (
    status === 401 ||
    name === 'AuthenticationError' ||
    rawMessage.toLowerCase().includes('invalid api key') ||
    rawMessage.toLowerCase().includes('unauthorized') ||
    rawMessage.toLowerCase().includes('authentication')
  ) {
    return new GroqError(
      `Groq Authentication Failure: ${rawMessage}`,
      {
        errorCode: 'AuthenticationError',
        statusCode: 401,
        isRetryable: false,
        likelyCause:
          'The provided GROQ_API_KEY is invalid, expired, missing, or lacks authorization.',
        correctiveAction:
          '1. Obtain a free Groq API key from https://console.groq.com/keys\n' +
          '2. Ensure GROQ_API_KEY is set in your .env file or environment.',
        modelId,
      },
      err,
    );
  }

  // 2. Rate Limit / Throttling (429 - Retryable)
  if (
    status === 429 ||
    name === 'RateLimitError' ||
    rawMessage.toLowerCase().includes('rate limit') ||
    rawMessage.toLowerCase().includes('too many requests') ||
    rawMessage.toLowerCase().includes('tpm') ||
    rawMessage.toLowerCase().includes('rpm')
  ) {
    return new GroqError(
      `Groq Rate Limit Exceeded: ${rawMessage}`,
      {
        errorCode: 'RateLimitError',
        statusCode: 429,
        isRetryable: true,
        likelyCause:
          `Requests per minute (RPM) or tokens per minute (TPM) quota exceeded on Groq for model "${modelId}".`,
        correctiveAction:
          '1. Implement exponential backoff retry delays.\n' +
          '2. Check current limits at https://console.groq.com/settings/limits or switch to a higher-capacity model.',
        modelId,
      },
      err,
    );
  }

  // 3. Model Not Found / Resource Not Found (404 - Permanent)
  if (
    status === 404 ||
    name === 'NotFoundError' ||
    rawMessage.toLowerCase().includes('model not found') ||
    rawMessage.toLowerCase().includes('does not exist')
  ) {
    return new GroqError(
      `Groq Model Not Found: ${rawMessage}`,
      {
        errorCode: 'NotFoundError',
        statusCode: 404,
        isRetryable: false,
        likelyCause:
          `Model "${modelId}" was not found or has been deprecated on Groq.`,
        correctiveAction:
          'Check active models at https://console.groq.com/docs/models and update GROQ_MODEL in .env (e.g., "llama-3.3-70b-versatile" or "llama-3.1-8b-instant").',
        modelId,
      },
      err,
    );
  }

  // 4. Bad Request / Validation (400 - Permanent)
  if (
    status === 400 ||
    name === 'BadRequestError' ||
    rawMessage.toLowerCase().includes('context length') ||
    rawMessage.toLowerCase().includes('maximum context')
  ) {
    return new GroqError(
      `Groq Validation Error: ${rawMessage}`,
      {
        errorCode: 'BadRequestError',
        statusCode: 400,
        isRetryable: false,
        likelyCause:
          `Invocation parameters are invalid or prompt exceeded the model's context window for "${modelId}".`,
        correctiveAction:
          'Ensure prompt length and maxTokens do not exceed the model context window, and temperature is within [0.0, 2.0].',
        modelId,
      },
      err,
    );
  }

  // 5. Service Unavailable / Internal Server Error (500, 503 - Retryable)
  if (
    status === 503 ||
    status === 500 ||
    status === 502 ||
    name === 'InternalServerError' ||
    name === 'ServiceUnavailableError' ||
    rawMessage.toLowerCase().includes('service unavailable')
  ) {
    return new GroqError(
      `Groq Service Unavailable: ${rawMessage}`,
      {
        errorCode: 'ServiceUnavailableError',
        statusCode: status ?? 503,
        isRetryable: true,
        likelyCause:
          'Groq inference platform is temporarily overloaded or experiencing service degradation.',
        correctiveAction:
          'Retry after a short delay. Monitor status at https://status.groq.com.',
        modelId,
      },
      err,
    );
  }

  // 6. Network / Timeout Error (Retryable)
  if (
    name === 'APIConnectionTimeoutError' ||
    name === 'APIConnectionError' ||
    name === 'TimeoutError' ||
    rawMessage.includes('ETIMEDOUT') ||
    rawMessage.includes('ENOTFOUND') ||
    rawMessage.includes('ECONNREFUSED') ||
    rawMessage.toLowerCase().includes('timed out')
  ) {
    return new GroqError(
      `Groq Network Error: ${rawMessage}`,
      {
        errorCode: 'APIConnectionError',
        statusCode: 504,
        isRetryable: true,
        likelyCause:
          'Could not connect to Groq API endpoint (api.groq.com). Connection timed out or DNS failed.',
        correctiveAction:
          'Verify internet connectivity, firewall rules, and ensure api.groq.com is reachable.',
        modelId,
      },
      err,
    );
  }

  // Fallback
  return new GroqError(
    `Groq Error [${name || 'UNKNOWN'}]: ${rawMessage}`,
    {
      errorCode: name || 'GROQ_ERROR',
      statusCode: status ?? 502,
      isRetryable: false,
      likelyCause: rawMessage,
      correctiveAction: 'Check GROQ_API_KEY and model configuration in .env.',
      modelId,
    },
    err,
  );
}

/**
 * Format a GroqError for user-friendly display in logs or CLI.
 */
export function formatGroqErrorMessage(err: GroqError): string {
  const lines = [
    `════════════════════════════════════════════════════════════════`,
    `GROQ LLM ERROR: [${err.errorCode ?? 'GROQ_ERROR'}]`,
    `════════════════════════════════════════════════════════════════`,
    `Model:            ${err.modelId ?? 'N/A'}`,
    `Retryable:        ${err.isRetryable ? 'YES (temporary error)' : 'NO (permanent configuration issue)'}`,
    `HTTP Status:      ${err.statusCode}`,
    ``,
    `Error Message:`,
    `  ${err.message}`,
    ``,
    `Likely Cause:`,
    `  ${err.likelyCause.split('\n').join('\n  ')}`,
    ``,
    `Corrective Action:`,
    `  ${err.correctiveAction.split('\n').join('\n  ')}`,
    `════════════════════════════════════════════════════════════════`,
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Backward-compatibility Bedrock error functions
// ---------------------------------------------------------------------------

export function isBedrockErrorLike(err: unknown): boolean {
  if (err instanceof BedrockError) return true;
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  const name = String(e['name'] ?? '');
  const code = String(e['code'] ?? '');
  const msg = String(e['message'] ?? '');

  return (
    name.includes('Exception') ||
    name.includes('Bedrock') ||
    code.includes('Exception') ||
    msg.includes('bedrock') ||
    msg.includes('credentials') ||
    Boolean(e['$metadata']) ||
    isGroqErrorLike(err)
  );
}

export function parseBedrockError(
  err: unknown,
  context?: { modelId?: string; region?: string; profile?: string },
): BedrockError {
  if (err instanceof BedrockError) {
    return err;
  }
  const groqErr = parseGroqError(err, context);
  const e = (err && typeof err === 'object' ? err : {}) as Record<string, unknown>;
  const name = String(e['name'] ?? e['code'] ?? '');
  const rawMessage = String(e['message'] ?? (err instanceof Error ? err.message : String(err)));
  const meta = e['$metadata'] as { httpStatusCode?: number } | undefined;
  const httpStatus = meta?.httpStatusCode ?? groqErr.statusCode;

  const modelId = context?.modelId ?? 'configured model';
  const region = context?.region ?? process.env['AWS_REGION'] ?? 'us-east-1';

  // Support legacy Bedrock exceptions if encountered in legacy tests
  if (name === 'AccessDeniedException' || rawMessage.includes('AccessDenied')) {
    return new BedrockError(`AWS Bedrock Access Denied: ${rawMessage}`, {
      awsErrorCode: 'AccessDeniedException',
      statusCode: 403,
      isRetryable: false,
      likelyCause: 'Your IAM user/role lacks permissions for "bedrock:InvokeModel".',
      correctiveAction: 'Attach an IAM policy granting "bedrock:InvokeModel" on the model resource.',
      modelId,
      region,
    }, err);
  }

  if (name === 'ValidationException' || rawMessage.includes('ValidationException')) {
    if (rawMessage.includes('Operation not allowed')) {
      return new BedrockError(`AWS Bedrock Model Access Not Enabled: ${rawMessage}`, {
        awsErrorCode: 'ValidationException',
        statusCode: 400,
        isRetryable: false,
        likelyCause: `Model access is not granted for "${modelId}" in region "${region}".`,
        correctiveAction: `Open AWS Bedrock Console: https://${region}.console.aws.amazon.com/bedrock/ -> Model access -> Modify model access.`,
        modelId,
        region,
      }, err);
    }
  }

  if (name === 'ResourceNotFoundException' || rawMessage.includes('ResourceNotFoundException')) {
    return new BedrockError(`AWS Bedrock Model Not Found: ${rawMessage}`, {
      awsErrorCode: 'ResourceNotFoundException',
      statusCode: 404,
      isRetryable: false,
      likelyCause: rawMessage.toLowerCase().includes('end of its life')
        ? `Model "${modelId}" has reached End-Of-Life (EOL).`
        : `Model ID "${modelId}" was not found.`,
      correctiveAction: 'Update BEDROCK_MODEL_ID in .env.',
      modelId,
      region,
    }, err);
  }

  if (name === 'ThrottlingException' || httpStatus === 429) {
    return new BedrockError(`AWS Bedrock Throttling: ${rawMessage}`, {
      awsErrorCode: 'ThrottlingException',
      statusCode: 429,
      isRetryable: true,
      likelyCause: 'Request rate or token throughput limit exceeded.',
      correctiveAction: 'Implement exponential backoff retry delays.',
      modelId,
      region,
    }, err);
  }

  if (name === 'ModelTimeoutException' || rawMessage.toLowerCase().includes('timed out')) {
    return new BedrockError(`AWS Bedrock Model Timeout: ${rawMessage}`, {
      awsErrorCode: 'ModelTimeoutException',
      statusCode: 504,
      isRetryable: true,
      likelyCause: `Model "${modelId}" timed out while processing generation.`,
      correctiveAction: 'Reduce prompt token length or maxTokens parameter.',
      modelId,
      region,
    }, err);
  }

  if (name === 'ServiceUnavailableException' || httpStatus === 503) {
    return new BedrockError(`AWS Bedrock Service Unavailable: ${rawMessage}`, {
      awsErrorCode: 'ServiceUnavailableException',
      statusCode: 503,
      isRetryable: true,
      likelyCause: 'Amazon Bedrock service is temporarily unavailable.',
      correctiveAction: 'Retry after a short backoff period.',
      modelId,
      region,
    }, err);
  }

  if (name === 'CredentialsProviderError' || rawMessage.includes('Could not load credentials')) {
    return new BedrockError(`AWS Bedrock Authentication Failure: ${rawMessage}`, {
      awsErrorCode: 'InvalidCredentialsException',
      statusCode: 401,
      isRetryable: false,
      likelyCause: 'Failed to load valid AWS credentials.',
      correctiveAction: 'Verify authentication with: aws sts get-caller-identity',
      modelId,
      region,
    }, err);
  }

  return new BedrockError(
    groqErr.message,
    {
      awsErrorCode: groqErr.errorCode,
      statusCode: groqErr.statusCode,
      isRetryable: groqErr.isRetryable,
      likelyCause: groqErr.likelyCause,
      correctiveAction: groqErr.correctiveAction,
      modelId,
      region,
    },
    err,
  );
}

export function formatBedrockErrorMessage(err: BedrockError): string {
  const lines = [
    `════════════════════════════════════════════════════════════════`,
    `AWS BEDROCK ERROR: [${err.awsErrorCode ?? 'BEDROCK_ERROR'}]`,
    `════════════════════════════════════════════════════════════════`,
    `Model:            ${err.modelId ?? 'N/A'}`,
    `Region:           ${err.region ?? 'N/A'}`,
    `Retryable:        ${err.isRetryable ? 'YES (temporary error)' : 'NO (permanent configuration issue)'}`,
    `HTTP Status:      ${err.statusCode}`,
    ``,
    `Error Message:`,
    `  ${err.message}`,
    ``,
    `Likely Cause:`,
    `  ${err.likelyCause.split('\n').join('\n  ')}`,
    ``,
    `Corrective Action:`,
    `  ${err.correctiveAction.split('\n').join('\n  ')}`,
    `════════════════════════════════════════════════════════════════`,
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Type guard & conversion
// ---------------------------------------------------------------------------

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

export function toAppError(err: unknown): AppError {
  if (isAppError(err)) return err;
  if (isGroqErrorLike(err)) return parseGroqError(err);
  if (isBedrockErrorLike(err)) return parseBedrockError(err);
  if (err instanceof Error) {
    return new AppError(err.message, 500, 'INTERNAL_ERROR');
  }
  return new AppError('An unexpected error occurred', 500, 'INTERNAL_ERROR');
}
