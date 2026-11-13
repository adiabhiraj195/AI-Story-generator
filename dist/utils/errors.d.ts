export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational: boolean;
    constructor(message: string, statusCode?: number, code?: string, isOperational?: boolean);
}
export declare class ValidationError extends AppError {
    readonly details?: unknown | undefined;
    constructor(message: string, details?: unknown | undefined);
}
export declare class NotFoundError extends AppError {
    constructor(resource: string, id: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
export declare class ServiceUnavailableError extends AppError {
    constructor(message: string);
}
export interface GroqErrorDetails {
    errorCode?: string | undefined;
    statusCode?: number | undefined;
    isRetryable?: boolean | undefined;
    likelyCause?: string | undefined;
    correctiveAction?: string | undefined;
    modelId?: string | undefined;
}
export declare class GroqError extends AppError {
    readonly cause?: unknown | undefined;
    readonly errorCode: string | undefined;
    readonly isRetryable: boolean;
    readonly likelyCause: string;
    readonly correctiveAction: string;
    readonly modelId: string | undefined;
    constructor(message: string, details?: Partial<GroqErrorDetails>, cause?: unknown | undefined);
}
export type BedrockErrorDetails = GroqErrorDetails & {
    awsErrorCode?: string | undefined;
    region?: string | undefined;
};
export declare class BedrockError extends GroqError {
    readonly cause?: unknown | undefined;
    readonly awsErrorCode: string | undefined;
    readonly region: string | undefined;
    constructor(message: string, details?: Partial<BedrockErrorDetails>, cause?: unknown | undefined);
}
export declare class WorkflowError extends AppError {
    readonly cause?: unknown | undefined;
    readonly stage?: string | undefined;
    constructor(message: string, stage?: string, cause?: unknown | undefined);
}
export declare function isGroqErrorLike(err: unknown): boolean;
/**
 * Parses Groq SDK and HTTP errors into rich, actionable GroqError instances.
 * Accurately categorises permanent errors (no retry) vs transient errors (retryable).
 */
export declare function parseGroqError(err: unknown, context?: {
    modelId?: string;
}): GroqError;
/**
 * Format a GroqError for user-friendly display in logs or CLI.
 */
export declare function formatGroqErrorMessage(err: GroqError): string;
export declare function isBedrockErrorLike(err: unknown): boolean;
export declare function parseBedrockError(err: unknown, context?: {
    modelId?: string;
    region?: string;
    profile?: string;
}): BedrockError;
export declare function formatBedrockErrorMessage(err: BedrockError): string;
export declare function isAppError(err: unknown): err is AppError;
export declare function toAppError(err: unknown): AppError;
//# sourceMappingURL=errors.d.ts.map