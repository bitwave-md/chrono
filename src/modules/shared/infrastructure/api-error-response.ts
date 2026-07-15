import { ApplicationError } from "@/modules/shared/application/application-error";

export class ApiErrorResponse {
  static from(error: unknown): Response {
    if (error instanceof ApplicationError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    console.error(error);

    return Response.json(
      {
        error: {
          code: "internal_error",
          message: "An unexpected error occurred.",
        },
      },
      { status: 500 },
    );
  }
}
