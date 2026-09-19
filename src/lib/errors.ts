import { ZodError } from "zod";

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ZodError) return err.issues[0]?.message ?? fallback;
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  ) {
    return "Já existe um registro com estes dados.";
  }
  if (err instanceof Error) return err.message;
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof err.message === "string"
  ) {
    return err.message;
  }
  return fallback;
}
