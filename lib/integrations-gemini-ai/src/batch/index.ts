export { isRateLimitError } from "./utils";

export interface BatchOptions {
  concurrency?: number;
  retries?: number;
}

export async function batchProcess<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  options: BatchOptions = {},
): Promise<R[]> {
  const { concurrency = 3 } = options;
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

export async function batchProcessWithSSE<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  options: BatchOptions = {},
): Promise<R[]> {
  return batchProcess(items, fn, options);
}
