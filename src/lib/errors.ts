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

/**
 * supabase.functions.invoke() swallows the Edge Function's error response body
 * by default — this pulls the real `{ error: "..." }` message back out so it
 * can be shown instead of a generic toast.
 */
export async function getFunctionErrorMessage(err: unknown): Promise<string> {
  if (
    typeof err === "object" &&
    err !== null &&
    "context" in err &&
    (err as { context?: unknown }).context instanceof Response
  ) {
    try {
      const response = (err as { context: Response }).context;
      const body = await response.clone().json();
      if (body && typeof body.error === "string") return body.error;
    } catch {
      // ignore: response body wasn't JSON
    }
  }
  return err instanceof Error ? err.message : "";
}
