export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "INVALID_INPUT",
  ) {
    super(message);
  }
}

export function errorMessage(error: unknown) {
  return error instanceof AppError
    ? error.message
    : "Something went wrong. Please try again.";
}
