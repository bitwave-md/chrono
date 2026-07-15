export class ApplicationError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(
    message: string,
    code: string,
    status: number,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = new.target.name;
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super(message, "validation_error", 400);
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message = "Authentication is required.") {
    super(message, "unauthorized", 401);
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = "This action is not permitted.") {
    super(message, "forbidden", 403);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string) {
    super(message, "not_found", 404);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super(message, "conflict", 409);
  }
}
