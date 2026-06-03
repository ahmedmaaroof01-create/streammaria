/**
 * Small visitor-id helper. Persists a random key in localStorage so we can
 * track interactions per device without requiring login.
 */
export function getVisitorKey(): string {
  if (typeof window === "undefined") return "ssr";
  const KEY = "visitor_key";
  let v = localStorage.getItem(KEY);
  if (!v) {
    v = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(KEY, v);
  }
  return v;
}
