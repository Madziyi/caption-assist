export function newestFirst<T>(items: readonly T[]): T[] {
  return [...items].reverse();
}
