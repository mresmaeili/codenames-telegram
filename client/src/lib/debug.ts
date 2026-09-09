export function debugLog(...values: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug(...values);
  }
}

export function debugWarn(...values: unknown[]): void {
  if (import.meta.env.DEV) {
    console.warn(...values);
  }
}
