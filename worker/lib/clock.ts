export const clock = {
  now: (): number => Date.now(),
};

export function sqlTimestamp(ms: number = clock.now()): string {
  return new Date(ms).toISOString().replace("T", " ").replace("Z", "");
}
