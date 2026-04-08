export function isRateLimitError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("429");
}
