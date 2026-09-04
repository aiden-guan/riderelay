export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

export function errorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof AppError) return err.message;
  if (err instanceof Error && err.message === "Unauthorized") return "Sign in to continue.";
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
