interface PostgresErrorShape {
  code?: string;
  constraint?: string;
  cause?: unknown;
}

export function isUniqueViolation(
  error: unknown,
  constraint?: string,
): boolean {
  let current = error;

  for (let depth = 0; depth < 5; depth += 1) {
    if (!current || typeof current !== "object") {
      return false;
    }

    const candidate = current as PostgresErrorShape;

    if (
      candidate.code === "23505" &&
      (!constraint || candidate.constraint === constraint)
    ) {
      return true;
    }

    current = candidate.cause;
  }

  return false;
}
