export function createSessionId() {
  const random = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

export function makeTxHash(seed: string) {
  let value = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  const prefix = Math.abs(value).toString(16).padStart(8, "0");
  return `0x${prefix}${crypto.randomUUID().replaceAll("-", "")}${"0".repeat(24)}`.slice(0, 66);
}
